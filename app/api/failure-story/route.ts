import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { topics, articles, experiences } from "@/db/schema";
import { uploadImage } from "@/lib/wp";
import { trackUsage } from "@/lib/track-usage";

export const dynamic = "force-dynamic";

// 失敗談の生データ（事実＋写真）から T5 記事を生成する。
// 事実は改変せず、構成・表現のみAIが膨らませる。写真はWPにアップして本文に差し込む。
export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "ANTHROPIC_API_KEY 未設定" }, { status: 500 });

    const form = await req.formData();
    const facts = (form.get("facts") as string ?? "").trim();
    const lesson = (form.get("lesson") as string ?? "").trim();
    if (!facts) return NextResponse.json({ error: "失敗の事実を入力してください" }, { status: 400 });

    // 画像をWPにアップロード（任意・複数）
    const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
    const imageUrls: string[] = [];
    for (const file of files.slice(0, 6)) {
      try {
        const buf = Buffer.from(await file.arrayBuffer());
        const safeName = `failure-${Date.now()}-${imageUrls.length}.${(file.type.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "")}`;
        const { url } = await uploadImage(buf, safeName, file.type);
        if (url) imageUrls.push(url);
      } catch (e) {
        console.warn("[failure-story] image upload skipped:", e instanceof Error ? e.message : e);
      }
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const imgList = imageUrls.length
      ? imageUrls.map((u, i) => `画像${i + 1}: ${u}`).join("\n")
      : "（画像なし）";

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: `あなたは投資ブログのライターです。下記の「失敗談の生データ」を元に、T5(失敗談・教訓型)の記事をMarkdownで書いてください。

【最重要ガードレール】
- 入力された事実（銘柄/時期/金額/行動/結果）を一切改変・脚色・創作しない。AIの役割は構成・表現・分かりやすさの向上のみ。
- 新たな失敗エピソードや数値を作らない。書かれていないことは書かない。
- 一人称（私は/自分は）。煽り・過度な自虐は避け、読者が再現できる教訓に変換する。
- 断定的な投資助言は禁止。末尾に元本割れリスクの一文を入れる。
- H2/H3見出しで構成。冒頭に結論（何でいくら失敗したか）を先出し。
- 「何が悪かったか」の敗因と「今ならどうするか」を必ず入れる。
- [AFFILIATE:証券口座] を教訓→次の行動の文脈で1回だけ自然に配置（直前に動機づけの導線文）。
- [FAQ] を末尾付近に1つ置く。

【画像の配置】
- 以下の画像URLを、時系列や敗因など内容に合う箇所に <figure style="margin:20px 0"><img src="URL" alt="説明" style="max-width:100%;border-radius:8px"/></figure> の形で本文に差し込む。
- 画像が無い場合は差し込まない。
${imgList}

【失敗談の生データ（改変禁止）】
${facts}

【今ならどうするか（任意）】
${lesson || "（未入力。事実から無理に作らない）"}

次のJSONのみ返す:
{ "title": "32字以内の記事タイトル（失敗談として自然な一人称寄り）", "body": "Markdown本文（上記プレースホルダ・画像HTML込み）" }`,
      }],
    });
    void trackUsage({ operation: "failure_story", model: "claude-sonnet-4-6", inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens });

    const text = msg.content.filter(b => b.type === "text").map(b => (b as { text: string }).text).join("").trim();
    const json = text.match(/\{[\s\S]*\}/);
    if (!json) return NextResponse.json({ error: "記事生成に失敗しました" }, { status: 500 });
    const parsed = JSON.parse(json[0]) as { title: string; body: string };
    const title = (parsed.title ?? "失敗談").slice(0, 60);
    const body = parsed.body ?? "";
    if (body.length < 100) return NextResponse.json({ error: "生成結果が短すぎます" }, { status: 500 });

    // トピック作成（生データを保持）
    const [topic] = await db.insert(topics).values({
      source: "idea", title, template: "T5", status: "drafted",
      failureRaw: facts, failureLesson: lesson || null, failureImages: imageUrls,
    }).returning();

    // 記事作成（編集画面へ）
    const [article] = await db.insert(articles).values({
      topicId: topic.id, title, bodyMd: body, aiModel: "claude-sonnet-4-6",
      template: "T5", visuals: [], faq: [], status: "review",
    }).returning();

    // T5の体験スロットを生データで充足（公開ゲートを通すため）
    await db.insert(experiences).values([
      { articleId: article.id, label: "失敗の骨子", note: facts, completed: true },
      { articleId: article.id, label: "今ならどうするか", note: lesson || facts, completed: true },
    ]);

    return NextResponse.json({ ok: true, articleId: article.id, images: imageUrls.length });
  } catch (e) {
    console.error("[failure-story] failed:", e instanceof Error ? e.stack ?? e.message : e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
