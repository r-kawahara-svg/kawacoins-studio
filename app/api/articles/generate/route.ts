import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { topics, articles, judgments, experiences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTemplate } from "@/lib/templates";
import { trackUsage } from "@/lib/track-usage";

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
- [EXPERIENCE:XXX] は後で置換されるプレースホルダ。本文中に残す場合はタグだけ（例: [EXPERIENCE:きっかけ・背景]）。「未使用」「未入力」などの余計な文字を付け足さない。
- デメリット・注意点のセクションを必ず含める。
- 数値（株価、利回り、成績など）は捏造禁止。不明なら「公式サイトで確認してください」。
- 末尾の免責文・編集表示を削除しない。`.trim();

const AFFILIATE_VOCAB = `証券口座 / nisa / ideco / 個別株 / スイング / 投資信託 / 米国株 / fx / クレカ積立 / ロボアド / ipo`;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topicId } = body as { topicId: string };

  // 現在の年を動的に取得（年号ハードコード防止）
  const now = new Date();
  const currentYear = now.getFullYear();
  const dateStr = `${currentYear}年${now.getMonth() + 1}月${now.getDate()}日`;

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

【現在の日付・年号ルール】
現在の日付: ${dateStr}
- タイトルや本文で「○○年版」「最新」「今年」と書く場合は必ず${currentYear}年を使う。
- ${currentYear - 1}年以前を「最新」「今年」「現在」と書いてはいけない。
- 過去の出来事・データを「${currentYear - 1}年のデータによると」のように過去形で触れるのは可。

【文体・段落ルール（最重要・必ず守ること）】
- 一人称の語りで口語寄りに書く（「正直〜でした」「〜なんですよね」「やってみて分かったんですが」など）
- 読者に語りかけるトーンを保つ（「〜と思いませんか？」「ぜひ一度試してみてください」など）
- 絵文字・過剰な感嘆符（！！）は使わない
- T1/T5は一人称の実感ベース、T2/T3は親しみやすく要点明快に
- デメリット・不満点は正直に書く（「正直、ここは不満でした」）
- 硬い論文調・マニュアル調にならない
- **1段落は必ず2〜3文まで**。それ以上続く場合は必ず空行（改行を2つ）で段落を分ける。
- 段落と段落の間、見出しの前後、箇条書きの前後には必ず空行を入れる。
- スマホで「文字の塊」にしない。長文を詰め込まない。

【URLルール（厳守）】
- 本文中にURLやハイパーリンクを一切書かない（httpで始まる文字列禁止）。
- アフィリエイトリンクの挿入は必ず [AFFILIATE:テーマ名] プレースホルダのみで行う。
- まとめ・注意事項等にリンクを入れない。
- 公式サイトを案内する場合は「公式サイトで確認してください」とテキストのみで書く。

【アフィリエイト導線ルール（必ず守ること）】
[AFFILIATE:テーマ名] プレースホルダを配置する直前に、以下の順で3〜4文の導線文を書くこと:
1. 「今が動くべきタイミング」を伝える一文（制度改正・上限変更・期限など具体的な理由を添える）
2. 「口座開設だけ先にしておけばOK」「後から銘柄は変えられる」など、ハードルを下げる一文
3. 使っているサービスや選んだ理由を一人称で自然に紹介（「私が選んだのは〜」「〜が使いやすいと感じたのは」）
4. 行動を促す締め（「まずは口座開設ページだけ見てみてください」「無料で開設できるので〜」）
押し売りにならず「読者が自分で決断する」形で自然に誘導すること。強引なセールスや「絶対おすすめ」表現は使わない。

【JIN:R装飾ルール（必ず守ること）】
以下の記法を使うと、後処理で適切なHTMLに変換される（後処理任せでよい）:
- 重要キーワード・数値: <mark>テキスト</mark> で囲む（1見出しに1〜2か所まで）
- 注意・デメリット強調: <strong style="color:#e53e3e">テキスト</strong> で囲む
- 補足・まとめボックス: [JINBOX:note]内容[/JINBOX]（H2区切りに1つまで）
- 注意喚起ボックス: [JINBOX:warn]内容[/JINBOX]（デメリット・リスク説明に使う）
- ポイントボックス: [JINBOX:point]内容[/JINBOX]（要点まとめに使う）
- 一言コメント・本音: [CALLOUT]内容[/CALLOUT]（体験談と相性良い）
- 箇条書き: 3つ以上の並列要素は必ずMarkdownリスト（- item）でリスト化
- 会話吹き出し: 読者が抱きやすい素朴な疑問と、それへの回答を会話形式で見せる:
  [TALK:reader]読者目線の素朴な疑問・つまずきポイントを1〜2文[/TALK]
  [TALK:author]それに答える・補足する（一人称、親しみやすく）1〜3文[/TALK]
  必ず reader → author の順でペアにする。記事全体で2〜3ペアまで。
  難しい用語や制度の説明の直前、または読者がつまずきそうな箇所に置くと効果的。

過剰装飾禁止: H2セクション1つあたり装飾は合計3〜4個まで。カラフルにしない。
会話吹き出しは「読みやすさのアクセント」。多用しすぎず、ここぞという箇所に絞る。

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
金融商品への投資は元本割れリスクがあることを適切に言及する。`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  void trackUsage({ operation: "generate_body", model: "claude-sonnet-4-6", inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens });

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
- chart: { "id": "v1", "kind": "chart", "title": "...", "caption": "...", "source": "出典明記(不明なら空)", "series": [{"label":"系列名","values":[数値, 数値, ...]}] }

【chartの重要ルール】
- chartのvaluesには必ず実際の数値(number)を入れる。文字列・null・0埋めは不可。
- 本文に数値データ（売上高・利益・EPS等）が記載されていない場合は、そのchartエントリを含めず空配列 [] にする。
- 数値を捏造しない。本文に書かれた数値のみ使用。

データが本文から読み取れない場合は空配列 [] を返してください。JSON のみ返してください。`;

    const visualMsg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: visualPrompt }],
    });
    void trackUsage({ operation: "generate_visuals", model: "claude-sonnet-4-6", inputTokens: visualMsg.usage.input_tokens, outputTokens: visualMsg.usage.output_tokens });

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
    void trackUsage({ operation: "generate_faq", model: "claude-sonnet-4-6", inputTokens: faqMsg.usage.input_tokens, outputTokens: faqMsg.usage.output_tokens });

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
