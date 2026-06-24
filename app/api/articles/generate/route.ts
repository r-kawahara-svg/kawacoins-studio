import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { topics, articles, judgments, experiences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTemplate } from "@/lib/templates";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface VisualItem {
  id: string;
  kind: "table" | "steps" | "chart";
  title: string;
  caption: string;
  source: string;
  columns?: string[];
  rows?: string[][];
  steps?: { step: number; label: string; detail: string }[];
  series?: { label: string; values: number[] }[];
}

interface FaqItem {
  question: string;
  answer: string;
}

const GUARDRAILS = `
【ガードレール（必ず守ること）】
- コピーライト侵害となる引用は不可。出典URLから直接文章を転写しない。
- 特定銘柄・商品への一括推奨は不可。「この株を買え」「絶対儲かる」等は使わない。
- [EXPERIENCE:XXX] が本文に残っていたら「未使用」と明記する（削除しない）。
- デメリット・注意点のセクションを必ず含める。
- 数値（株価、利回り、成績など）は捏造禁止。不明なら「公式サイトで確認してください」。
- 末尾の免責文・編集表示を削除しない。`.trim();

const AFFILIATE_VOCAB = `証券口座 / nisa / ideco / 個別株 / スイング / 投資信託 / 米国株 / fx / クレカ積立 / ロボアド / ipo`;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topicId } = body as { topicId: string };

  if (!topicId) {
    return NextResponse.json({ error: "topicId required" }, { status: 400 });
  }

  const [topic] = await db.select().from(topics).where(eq(topics.id, topicId));
  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  const tmpl = getTemplate(topic.template);
  const skeleton = tmpl
    ? tmpl.skeleton
        .replace("{TITLE}", topic.title)
        .replace("{CTA_THEME}", tmpl.ctaThemes[0] ?? "証券口座")
    : null;

  const t5Guardrails = topic.template === "T5" ? `
【T5専用ガードレール（最重要）】
- [EXPERIENCE:失敗の骨子] に書かれた事実（銘柄/時期/損失額/行動）を一切改変・追加・脚色しない。
  AIの役割は「構成・表現・分かりやすさ」の向上のみ。新たな失敗エピソードを創作しない。
- 膨らませ強度=中: 構成立て・敗因の表化・教訓の言語化まで行う。性格付けや過度なストーリー化は不可。
- 反省を読者が再現可能な教訓に変換する。感情の煽り・自虐の過剰演出は不可。
- 一人称はユーザーの語り口（「私は」「自分は」）を保つ。
` : "";

  const systemPrompt = `あなたは個人投資家向けの金融記事ライターです。
以下のルールを厳守してください：
- 断定を避け投資助言にならない表現を使う（「〜と考えられる」「一例として」「〜の可能性がある」など）
- H2/H3 Markdown見出しを使って構造化する
- アフィリエイトリンクの挿入箇所には [AFFILIATE:テーマ名] を適切な位置に配置する（複数可）
  テーマ名は必ず以下の統制語彙から記事内容に合うものだけを選ぶ（無理に全部使わない）：
  ${AFFILIATE_VOCAB}
  ※表記はこの通り（小文字/日本語を厳守）。
${GUARDRAILS}${t5Guardrails}`;

  const userPrompt = skeleton
    ? `以下の骨格に従って、投資家向け記事を3000文字程度で完成させてください。

タイトル: ${topic.title}
カテゴリ: ${topic.source}
キーワード: ${topic.keyword ?? "なし"}
概要メモ: ${topic.summary ?? "なし"}
出典URL: ${topic.sourceUrl ?? "なし"}
テンプレート: ${tmpl!.name}（${topic.template}）

【骨格】
${skeleton}

---
骨格中の [EXPERIENCE:XXX] は体験談・感想を書く箇所です。情報が不足している場合は「（未使用）」とそのまま残してください。
[TABLE:XXX] / [STEPS:XXX] / [CHART:XXX] / [FAQ] / [AFFILIATE:XXX] はプレースホルダとして本文に残してください（後処理で置換されます）。`
    : `以下のトピックについて投資家向けの記事を書いてください。

タイトル: ${topic.title}
カテゴリ: ${topic.source}
キーワード: ${topic.keyword ?? "なし"}
概要メモ: ${topic.summary ?? "なし"}
出典URL: ${topic.sourceUrl ?? "なし"}

3000文字程度の記事を作成し、[AFFILIATE:テーマ] プレースホルダも適切な位置に配置してください。
記事末尾は必ず「この記事はAIの下書きをもとに運営者が編集しています」で終わる。
金融商品への投資は元本割れリスクがあることを適切に言及する。`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const bodyMd = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  let visuals: VisualItem[] = [];
  let faq: FaqItem[] = [];

  if (tmpl && tmpl.requiredVisuals.length > 0) {
    const visualLabels = tmpl.requiredVisuals.map((v) => `${v.kind}:${v.label}`).join(", ");
    const visualPrompt = `以下の記事本文から、図表データを JSON 配列として抽出してください。
対象: ${visualLabels}

記事本文:
${bodyMd}

各要素の形式:
- table: { "id": "v1", "kind": "table", "title": "...", "caption": "...", "source": "...", "columns": [...], "rows": [[...]] }
- steps: { "id": "v1", "kind": "steps", "title": "...", "caption": "...", "source": "...", "steps": [{"step":1,"label":"...","detail":"..."}] }
- chart: { "id": "v1", "kind": "chart", "title": "...", "caption": "...", "source": "...", "series": [{"label":"...","values":[...]}] }

データが本文から読み取れない場合は空配列 [] を返してください。JSON のみ返してください。`;

    const visualMsg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: visualPrompt }],
    });

    const visualText = visualMsg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    try {
      const jsonMatch = visualText.match(/\[[\s\S]*\]/);
      visuals = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      visuals = [];
    }
  }

  if (bodyMd.includes("[FAQ]")) {
    const faqPrompt = `以下の記事トピックに関するよくある質問（FAQ）を5件、JSON配列で生成してください。

トピック: ${topic.title}
キーワード: ${topic.keyword ?? "なし"}

形式: [{ "question": "質問", "answer": "回答（2〜4文程度）" }]
JSON のみ返してください。`;

    const faqMsg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [{ role: "user", content: faqPrompt }],
    });

    const faqText = faqMsg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    try {
      const jsonMatch = faqText.match(/\[[\s\S]*\]/);
      faq = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      faq = [];
    }
  }

  const titleMatch = bodyMd.match(/^#{1,2}\s+(.+)$/m);
  const articleTitle = titleMatch ? titleMatch[1] : topic.title;

  // テンプレート記事は 'review'（人の承認前提）、旧フロー記事は 'gate'
  const initialStatus = topic.template ? "review" : "gate";

  const [article] = await db
    .insert(articles)
    .values({
      topicId: topic.id,
      title: articleTitle,
      bodyMd,
      aiModel: "claude-sonnet-4-6",
      template: topic.template,
      visuals,
      faq,
      status: initialStatus,
    })
    .returning();

  if (!topic.template) {
    // 旧フロー: judgment レコードを作成
    await db.insert(judgments).values({
      articleId: article.id,
      tradeView: null,
      position: null,
      uniqueTake: null,
      completed: false,
    });
  } else {
    // 新フロー: experienceSlots の空レコードを作成
    const tmplDef = (await import("@/lib/templates")).getTemplate(topic.template);
    if (tmplDef && tmplDef.experienceSlots.length > 0) {
      for (const label of tmplDef.experienceSlots) {
        await db.insert(experiences).values({
          articleId: article.id,
          label,
          completed: false,
        });
      }
    }
  }

  await db
    .update(topics)
    .set({ status: "drafted" })
    .where(eq(topics.id, topicId));

  return NextResponse.json({
    articleId: article.id,
    template: topic.template,
    visualsCount: visuals.length,
    faqCount: faq.length,
  });
}
