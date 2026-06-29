/**
 * 記事公開処理（共有ロジック）
 * API route と Server Action の両方から呼ぶ
 */
import { db } from "@/db";
import { articles, judgments, experiences, topics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { marked } from "marked";
import {
  createDraftPost, injectAffiliateRel, uploadMedia, setFeaturedMedia,
  getWpCategories, getWpTags, findOrCreateTag, findOrCreateCategory, pickBestCategory,
  updatePostContent, updatePostTaxonomy,
} from "@/lib/wp";
import { generateEyecatchPng } from "@/lib/eyecatch";
import { applyJinRFormat } from "@/lib/format";
import { isJudgmentComplete } from "@/lib/gate";
import { replaceAffiliatePlaceholders } from "@/lib/affiliate";
import { getTemplate } from "@/lib/templates";
import { applyVisuals, renderFaq, Visual } from "@/lib/visuals";
import { trackUsage } from "@/lib/track-usage";

export interface PublishResult {
  wpPostId?: number;
  link?: string;
  skipped?: string;
  status: string;
}

// テンプレート → デフォルトカテゴリ名
const TEMPLATE_CATEGORY: Record<string, string> = {
  T1: "投資体験談",
  T2: "証券口座比較",
  T3: "投資の始め方",
  T4: "決算分析",
  T5: "投資の失敗談",
  T6: "制度・税制解説",
};

// ─── WPカテゴリ・タグ解決 ─────────────────────────────────────────
export async function resolveWpTaxonomy(
  title: string,
  keyword: string | null | undefined,
  template: string | null | undefined,
): Promise<{ wpCategories: number[]; wpTags: number[] }> {
  try {
    const [cats, existingTags] = await Promise.all([getWpCategories(), getWpTags()]);
    // ① 既存カテゴリからタイトル/キーワードで最良マッチを探す
    let catId = pickBestCategory(cats, title, keyword);

    // ② マッチしなければテンプレ種別のカテゴリを findOrCreate（必ず付与）
    if (!catId && template && TEMPLATE_CATEGORY[template]) {
      catId = await findOrCreateCategory(TEMPLATE_CATEGORY[template]);
    }

    const wpCategories = catId ? [catId] : [];
    console.log(`[taxonomy] template=${template} catId=${catId ?? "none"} title="${title.slice(0, 30)}"`);

    // タグ: キーワードを分割して既存タグを探し、なければ作成（最大3個）
    const tagCandidates = [
      ...(keyword?.split(/[\s　・、。\/]+/).filter(w => w.length >= 2) ?? []),
    ].slice(0, 3);

    const wpTags: number[] = [];
    for (const candidate of tagCandidates) {
      // 既存タグから完全一致 or 部分一致を探す
      const existing = existingTags.find(
        t => t.name === candidate || t.name.includes(candidate) || candidate.includes(t.name)
      );
      if (existing) {
        wpTags.push(existing.id);
      } else {
        const newId = await findOrCreateTag(candidate);
        if (newId) wpTags.push(newId);
      }
      if (wpTags.length >= 3) break;
    }

    return { wpCategories, wpTags };
  } catch (e) {
    console.warn("[taxonomy] skipped:", e instanceof Error ? e.message : e);
    return { wpCategories: [], wpTags: [] };
  }
}

// 選択肢ラベルを文中で自然に読める語句へ変換
const CHOICE_NATURAL: Record<string, string> = {
  "強気": "個人的には強気で見ており、",
  "中立": "見通しとしては中立で、",
  "様子見": "現時点では様子見の姿勢で、",
  "満足": "実際に使ってみて満足しています。",
  "ふつう": "使ってみると普通といった印象で、",
  "不満": "正直なところ少し不満もあり、",
  "買い": "個人的には買い目線で、",
  "売り": "個人的には売り目線で、",
  "ホールド": "現在はホールドで保有しており、",
  "あり": "",
  "なし": "",
};

function experienceToText(choice: string | null, note: string | null, label: string): string {
  const choicePhrase = choice ? (CHOICE_NATURAL[choice] ?? `${choice}。`) : "";
  if (note && note.trim()) {
    // note が主体。choice を前置きとして自然につなぐ
    return choicePhrase ? `${choicePhrase}${note.trim()}` : note.trim();
  }
  if (choicePhrase) return choicePhrase.replace(/[、。]$/, "");
  return `（${label}）`;
}

// 体験コメント(生の入力)を、記事に馴染む自然な文章へAIで書き換える。
// 複数スロットを1回のClaude呼び出しでまとめて整える。
// ANTHROPIC_API_KEY 未設定・失敗時は experienceToText の素の値にフォールバック。
async function polishExperiences(
  exps: { label: string; choice: string | null; note: string | null }[],
  title: string,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  // まず素の値で埋めておく（フォールバック兼デフォルト）
  for (const e of exps) result[e.label] = experienceToText(e.choice, e.note, e.label);

  const filled = exps.filter(e => e.note?.trim());
  if (filled.length === 0 || !process.env.ANTHROPIC_API_KEY) return result;

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const items = filled.map((e, i) =>
      `${i + 1}. セクション「${e.label}」${e.choice ? `（選択: ${e.choice}）` : ""}\n   メモ: ${e.note!.trim()}`
    ).join("\n");

    const prompt = `あなたは投資ブログの編集者です。筆者が走り書きした体験メモを、記事にそのまま載せられる自然な文章へ整えてください。

記事タイトル: ${title}

【体験メモ（番号ごとに整える）】
${items}

【ルール】
- 一人称の語り口（です・ます調、口語寄り）で、読者に語りかけるトーン。
- メモの意図・事実は変えない。新しい事実や数値を創作しない。誇張・断定的助言にしない。
- 1項目あたり1〜3文。走り書きの言い切り（例「安いので！」）は、理由や文脈を補って自然な一文にする。
- 各項目を JSON で返す: [{ "n": 1, "text": "整えた文章" }, ...]。JSONのみ返す。`;

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });
    void trackUsage({ operation: "polish_experience", model: "claude-sonnet-4-6", inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens });

    const text = msg.content.filter(b => b.type === "text").map(b => (b as { text: string }).text).join("").trim();
    const json = text.match(/\[[\s\S]*\]/);
    if (json) {
      const arr = JSON.parse(json[0]) as { n: number; text: string }[];
      for (const it of arr) {
        const e = filled[it.n - 1];
        if (e && it.text?.trim()) result[e.label] = it.text.trim();
      }
    }
  } catch (err) {
    console.warn("[polish] skipped:", err instanceof Error ? err.message : err);
  }
  return result;
}

export class PublishError extends Error {
  constructor(public readonly userMessage: string, public readonly statusCode: number) {
    super(userMessage);
  }
}

type ArticleRow = typeof articles.$inferSelect;
type ExpRow = { label: string; choice: string | null; note: string | null };

// テンプレ記事の最終HTMLを組み立てる（体験ポリッシュ→図表→アフィリ→FAQ→装飾）。
// publish と「公開中のまま更新」で共通利用する。
async function buildTemplateHtml(article: ArticleRow, exps: ExpRow[]): Promise<string> {
  let bodyMd = article.bodyMd;
  const polished = await polishExperiences(exps, article.title);
  for (const exp of exps) {
    const replacement = polished[exp.label] ?? experienceToText(exp.choice, exp.note, exp.label);
    const re = new RegExp(`\\[EXPERIENCE:${exp.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`, "g");
    bodyMd = bodyMd.replace(re, replacement);
  }
  bodyMd = bodyMd.replace(/\[EXPERIENCE:[^\]]+\]/g, "");

  const visualsData = (article.visuals as Visual[]) ?? [];
  let bodyHtml = await marked(bodyMd);
  bodyHtml = applyVisuals(bodyHtml, visualsData);
  bodyHtml = await replaceAffiliatePlaceholders(bodyHtml);

  const faqData = (article.faq as { question: string; answer: string }[]) ?? [];
  bodyHtml = bodyHtml.replace(/\[FAQ\]/g, renderFaq(faqData));
  bodyHtml = bodyHtml.replace(/\[FAQ\]/g, "");

  bodyHtml = applyJinRFormat(bodyHtml);
  return injectAffiliateRel(bodyHtml);
}

// 公開中のWP記事を、現在のDB内容で「その場で」更新する（再投稿不要）。
// 本文・カテゴリ・アイキャッチを差し替え、公開状態と wpPostId は維持。
export async function updatePublishedArticle(articleId: string): Promise<PublishResult> {
  const [article] = await db.select().from(articles).where(eq(articles.id, articleId));
  if (!article) throw new PublishError("Article not found", 404);
  if (!article.wpPostId) throw new PublishError("未公開の記事です（公開中のみ更新可）", 400);
  if (!process.env.WP_BASE_URL) return { status: "published", skipped: "WP_BASE_URL not set" };

  const topicRow = article.topicId
    ? await db.select({ keyword: topics.keyword, summary: topics.summary })
        .from(topics).where(eq(topics.id, article.topicId)).limit(1).then(r => r[0])
    : undefined;

  const tmpl = getTemplate(article.template);
  const exps = tmpl && tmpl.experienceSlots.length > 0
    ? await db.select().from(experiences).where(eq(experiences.articleId, articleId))
    : [];

  const html = await buildTemplateHtml(article, exps);

  // 本文を差し替え（公開状態は維持される）
  await updatePostContent(article.wpPostId, { title: article.title, content: html });

  // カテゴリ・タグを再付与
  const { wpCategories, wpTags } = await resolveWpTaxonomy(article.title, topicRow?.keyword, article.template);
  await updatePostTaxonomy(article.wpPostId, wpCategories, wpTags);

  // アイキャッチを再生成して差し替え（失敗しても本文更新は維持）
  try {
    const png = await generateEyecatchPng(article.title, article.template, {
      keyword: topicRow?.keyword ?? undefined,
      description: topicRow?.summary?.slice(0, 50) ?? undefined,
    });
    const mediaId = await uploadMedia(png, `eyecatch-${article.id.slice(0, 8)}-${Date.now()}.png`);
    await setFeaturedMedia(article.wpPostId, mediaId);
  } catch (e) {
    console.warn("[eyecatch] update skipped:", e instanceof Error ? e.message : e);
  }

  await db.update(articles).set({ publishedAt: new Date() }).where(eq(articles.id, articleId));
  return { wpPostId: article.wpPostId, status: "published" };
}

export async function publishArticleById(articleId: string): Promise<PublishResult> {
  const [article] = await db.select().from(articles).where(eq(articles.id, articleId));
  if (!article) throw new PublishError("Article not found", 404);

  // eyecatch用: トピックのキーワード・概要を取得
  const topicRow = article.topicId
    ? await db.select({ keyword: topics.keyword, summary: topics.summary })
        .from(topics).where(eq(topics.id, article.topicId)).limit(1)
        .then(rows => rows[0])
    : undefined;
  const eyecatchOpts = {
    keyword: topicRow?.keyword ?? undefined,
    description: topicRow?.summary?.slice(0, 50) ?? undefined,
  };

  const tmpl = getTemplate(article.template);

  if (tmpl) {
    // ① 体験スロット充足チェック（スロットなし=T3/T6も template フローを通る）
    if (true) {
      const exps = tmpl.experienceSlots.length > 0
        ? await db.select().from(experiences).where(eq(experiences.articleId, articleId))
        : [];
      const missing = tmpl.experienceSlots.filter(
        (slot) => !exps.find((e) => e.label === slot && e.completed)
      );
      if (missing.length > 0) {
        throw new PublishError(`体験スロットが未充足です: ${missing.join(", ")}`, 422);
      }

      // ②〜⑥ 本文HTMLを組み立て（体験ポリッシュ・図表・アフィリ・FAQ・装飾）
      const html = await buildTemplateHtml(article, exps);

      if (!process.env.WP_BASE_URL) {
        await db.update(articles).set({ status: "published", publishedAt: new Date() }).where(eq(articles.id, articleId));
        return { skipped: "WP_BASE_URL not set", status: "published" };
      }

      // ⑦ カテゴリ・タグ解決
      const { wpCategories, wpTags } = await resolveWpTaxonomy(
        article.title, topicRow?.keyword, article.template
      );

      const wpResult = await createDraftPost({
        title: article.title, content: html, status: "draft",
        categories: wpCategories, tags: wpTags,
      });
      await db.update(articles).set({ status: "published", wpPostId: wpResult.id, publishedAt: new Date() }).where(eq(articles.id, articleId));

      // アイキャッチ生成・アップロード（失敗しても記事投稿を継続）
      try {
        const png = await generateEyecatchPng(article.title, article.template, eyecatchOpts);
        const filename = `eyecatch-${article.id.slice(0, 8)}.png`;
        const mediaId = await uploadMedia(png, filename);
        await setFeaturedMedia(wpResult.id, mediaId);
      } catch (e) {
        console.warn("[eyecatch] skipped:", e instanceof Error ? e.message : e);
      }

      return { wpPostId: wpResult.id, link: wpResult.link, status: "published" };
    }
  }

  // テンプレートなし or experienceSlots=[] の場合 → 旧 judgment フロー
  const [judgment] = await db.select().from(judgments).where(eq(judgments.articleId, articleId));
  if (!judgment || !isJudgmentComplete(judgment)) {
    throw new PublishError("判断ゲートが未完了です", 422);
  }

  let bodyMd = article.bodyMd
    .replace(/\[JUDGMENT:trade\]/g, judgment.tradeView ?? "")
    .replace(/\[JUDGMENT:position\]/g, judgment.position ?? "")
    .replace(/\[JUDGMENT:take\]/g, judgment.uniqueTake ?? "");

  bodyMd = await replaceAffiliatePlaceholders(bodyMd);
  const rawHtml = applyJinRFormat(await marked(bodyMd));
  const html = injectAffiliateRel(rawHtml);

  if (!process.env.WP_BASE_URL) {
    await db.update(articles).set({ status: "published", publishedAt: new Date() }).where(eq(articles.id, articleId));
    return { skipped: "WP_BASE_URL not set", status: "published" };
  }

  // ⑦ カテゴリ・タグ解決
  const { wpCategories, wpTags } = await resolveWpTaxonomy(
    article.title, topicRow?.keyword, article.template
  );

  const wpResult = await createDraftPost({
    title: article.title, content: html, status: "draft",
    categories: wpCategories, tags: wpTags,
  });
  await db.update(articles).set({ status: "published", wpPostId: wpResult.id, publishedAt: new Date() }).where(eq(articles.id, articleId));

  try {
    const png = await generateEyecatchPng(article.title, article.template);
    const filename = `eyecatch-${article.id.slice(0, 8)}.png`;
    const mediaId = await uploadMedia(png, filename);
    await setFeaturedMedia(wpResult.id, mediaId);
  } catch (e) {
    console.error("[eyecatch] 生成・アップロード失敗:", e instanceof Error ? e.stack ?? e.message : e);
  }

  return { wpPostId: wpResult.id, link: wpResult.link, status: "published" };
}
