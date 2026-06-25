import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { articles, topics, experiences } from "@/db/schema";
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
- コピーライト侵害となる引用は不可。
- 特定銘柄・商品への一括推奨は不可。「この株を買え」「絶対儲かる」等は使わない。
- [EXPERIENCE:XXX] は後で置換されるプレースホルダ。「未使用」などの文字を付け足さない。
- デメリット・注意点のセクションを必ず含める。
- 数値は捏造禁止。不明なら「公式サイトで確認してください」。
- 末尾の免責文を削除しない。`.trim();

const AFFILIATE_VOCAB = `証券口座 / nisa / ideco / 個別株 / スイング / 投資信託 / 米国株 / fx / クレカ積立 / ロボアド / ipo`;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: articleId } = await params;
  const body = await request.json() as { direction: string; template?: string };
  const { direction, template: newTemplate } = body;

  if (!direction?.trim()) {
    return NextResponse.json({ error: "direction required" }, { status: 400 });
  }

  const [article] = await db.select().from(articles).where(eq(articles.id, articleId));
  if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });

  const topicRow = article.topicId
    ? await db.select().from(topics).where(eq(topics.id, article.topicId)).limit(1).then(r => r[0])
    : undefined;

  const targetTemplate = newTemplate ?? article.template ?? "T6";
  const tmpl = getTemplate(targetTemplate);

  const now = new Date();
  const currentYear = now.getFullYear();
  const dateStr = `${currentYear}年${now.getMonth() + 1}月${now.getDate()}日`;

  const skeleton = tmpl
    ? tmpl.skeleton
        .replace("{TITLE}", article.title)
        .replace("{CTA_THEME}", tmpl.ctaThemes[0] ?? "証券口座")
    : null;

  const systemPrompt = `あなたは個人投資家向けの金融記事ライターです。
以下のルールを厳守してください：
- 断定を避け投資助言にならない表現を使う
- H2/H3 Markdown見出しを使って構造化する
- アフィリエイトリンクの挿入箇所には [AFFILIATE:テーマ名] を配置する
  テーマ名は必ず以下から選ぶ: ${AFFILIATE_VOCAB}

【現在の日付・年号ルール】
現在の日付: ${dateStr}
タイトルや本文で年号を書く場合は必ず${currentYear}年を使う。

【文体・段落ルール】
- 一人称の語りで口語寄りに書く
- 読者に語りかけるトーン
- 絵文字・過剰な感嘆符は使わない
- 1段落は必ず2〜3文まで。空行で段落を分ける。
- スマホで「文字の塊」にしない。

【URLルール】
- 本文中にURLを一切書かない。アフィリエイトは [AFFILIATE:テーマ名] のみ。

【アフィリエイト導線ルール（必ず守ること）】
[AFFILIATE:テーマ名] プレースホルダを配置する直前に、以下の順で3〜4文の導線文を書くこと:
1. 「今が動くべきタイミング」を伝える一文（制度改正・上限変更・期限など具体的な理由を添える）
2. 「口座開設だけ先にしておけばOK」「後から銘柄は変えられる」など、ハードルを下げる一文
3. 使っているサービスや選んだ理由を一人称で自然に紹介
4. 行動を促す締め（「まずは口座開設ページだけ見てみてください」「無料で開設できるので〜」）
押し売りにならず、読者が自分で決断できる形で誘導すること。

【JIN:R装飾ルール】
- 重要キーワード・数値: <mark>テキスト</mark>
- 注意強調: <strong style="color:#e53e3e">テキスト</strong>
- 補足ボックス: [JINBOX:note]内容[/JINBOX]
- 注意喚起: [JINBOX:warn]内容[/JINBOX]
- ポイント: [JINBOX:point]内容[/JINBOX]
- 箇条書き: 3つ以上は必ずMarkdownリスト

${GUARDRAILS}`;

  const userPrompt = skeleton
    ? `以下の骨格と方針に従って、投資家向け記事を3000文字程度で完成させてください。

タイトル: ${article.title}
キーワード: ${topicRow?.keyword ?? "なし"}
概要メモ: ${topicRow?.summary ?? "なし"}
テンプレート: ${tmpl!.name}（${targetTemplate}）

【書き直しの方針・追加指示（最優先）】
${direction}

【骨格】
${skeleton}

---
[TABLE:XXX] / [STEPS:XXX] / [CHART:XXX] / [FAQ] / [AFFILIATE:XXX] はプレースホルダとして本文に残してください（後処理で置換されます）。
本文に関係のない説明文・メタ情報・指示内容は絶対に記事内に含めないこと。`
    : `以下のトピックについて、方針に従って投資家向けの記事を書いてください。

タイトル: ${article.title}
キーワード: ${topicRow?.keyword ?? "なし"}

【書き直しの方針・追加指示（最優先）】
${direction}

3000文字程度で作成し、[AFFILIATE:テーマ] プレースホルダも適切な位置に配置してください。`;

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
    const visualPrompt = `以下の記事本文から図表データをJSON配列として抽出してください。
対象: ${visualLabels}

記事本文:
${bodyMd}

各要素の形式:
- table: { "id": "v1", "kind": "table", "title": "...", "caption": "...", "source": "...", "columns": [...], "rows": [[...]] }
- steps: { "id": "v1", "kind": "steps", "title": "...", "caption": "...", "source": "...", "steps": [{"step":1,"label":"...","detail":"..."}] }
- chart: { "id": "v1", "kind": "chart", "title": "...", "caption": "...", "source": "...", "series": [{"label":"系列名","values":[数値]}] }

データが本文から読み取れない場合は空配列 [] を返してください。JSON のみ返してください。`;

    const visualMsg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: visualPrompt }],
    });

    const visualText = visualMsg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("").trim();

    try {
      const jsonMatch = visualText.match(/\[[\s\S]*\]/);
      visuals = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      visuals = [];
    }
  }

  if (bodyMd.includes("[FAQ]")) {
    const faqPrompt = `以下の記事トピックに関するよくある質問（FAQ）を5件、JSON配列で生成してください。

トピック: ${article.title}
キーワード: ${topicRow?.keyword ?? "なし"}

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
      .join("").trim();

    try {
      const jsonMatch = faqText.match(/\[[\s\S]*\]/);
      faq = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      faq = [];
    }
  }

  // 既存の experiences を削除
  await db.delete(experiences).where(eq(experiences.articleId, articleId));

  // 新テンプレートに合わせて experiences を再作成
  if (tmpl && tmpl.experienceSlots.length > 0) {
    for (const label of tmpl.experienceSlots) {
      await db.insert(experiences).values({ articleId, label, completed: false });
    }
  }

  // 記事を更新（ステータスを review に戻す）
  await db.update(articles).set({
    bodyMd,
    visuals,
    faq,
    template: targetTemplate,
    status: "review",
    wpPostId: null,
    publishedAt: null,
  }).where(eq(articles.id, articleId));

  return NextResponse.json({ ok: true, visualsCount: visuals.length, faqCount: faq.length });
}
