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
  getWpCategories, getWpTags, findOrCreateTag, pickBestCategory,
} from "@/lib/wp";
import { generateEyecatchPng } from "@/lib/eyecatch";
import { applyJinRFormat } from "@/lib/format";
import { isJudgmentComplete } from "@/lib/gate";
import { replaceAffiliatePlaceholders } from "@/lib/affiliate";
import { getTemplate } from "@/lib/templates";
import { applyVisuals, renderFaq, Visual } from "@/lib/visuals";

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
async function resolveWpTaxonomy(
  title: string,
  keyword: string | null | undefined,
  template: string | null | undefined,
): Promise<{ wpCategories: number[]; wpTags: number[] }> {
  try {
    const [cats, existingTags] = await Promise.all([getWpCategories(), getWpTags()]);
    let catId = pickBestCategory(cats, title, keyword);

    // マッチしない場合はテンプレートベースのカテゴリを findOrCreate
    if (!catId && template && TEMPLATE_CATEGORY[template]) {
      const catName = TEMPLATE_CATEGORY[template];
      const existing = cats.find(c => c.name === catName);
      if (existing) {
        catId = existing.id;
      } else {
        // WP REST API でカテゴリ新規作成
        const base = process.env.WP_BASE_URL?.replace(/\/$/, "");
        const auth = "Basic " + Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`).toString("base64");
        const res = await fetch(`${base}/?rest_route=/wp/v2/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: auth },
          body: JSON.stringify({ name: catName }),
        });
        if (res.ok) {
          const data = await res.json() as { id: number };
          catId = data.id;
        }
      }
    }

    const wpCategories = catId ? [catId] : [];

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

export class PublishError extends Error {
  constructor(public readonly userMessage: string, public readonly statusCode: number) {
    super(userMessage);
  }
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

      // ② [EXPERIENCE:*] 置換（選択肢ラベルが生で露出しないよう自然語に変換）
      let bodyMd = article.bodyMd;
      for (const exp of exps) {
        const replacement = experienceToText(exp.choice, exp.note, exp.label);
        const re = new RegExp(`\\[EXPERIENCE:${exp.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`, "g");
        bodyMd = bodyMd.replace(re, replacement);
      }
      bodyMd = bodyMd.replace(/\[EXPERIENCE:[^\]]+\]/g, "");

      // ③ visuals HTML展開
      const visualsData = (article.visuals as Visual[]) ?? [];
      let bodyHtml = await marked(bodyMd);
      bodyHtml = applyVisuals(bodyHtml, visualsData);

      // ④ AFFILIATE置換
      bodyHtml = await replaceAffiliatePlaceholders(bodyHtml);

      // ⑤ FAQ展開
      const faqData = (article.faq as { question: string; answer: string }[]) ?? [];
      bodyHtml = bodyHtml.replace(/\[FAQ\]/g, renderFaq(faqData));
      bodyHtml = bodyHtml.replace(/\[FAQ\]/g, "");

      // ⑥ JIN:R装飾変換
      bodyHtml = applyJinRFormat(bodyHtml);

      const html = injectAffiliateRel(bodyHtml);

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
