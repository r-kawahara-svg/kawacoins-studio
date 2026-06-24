/**
 * 記事公開処理（共有ロジック）
 * API route と Server Action の両方から呼ぶ
 */
import { db } from "@/db";
import { articles, judgments, experiences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { marked } from "marked";
import { createDraftPost, injectAffiliateRel } from "@/lib/wp";
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

export class PublishError extends Error {
  constructor(public readonly userMessage: string, public readonly statusCode: number) {
    super(userMessage);
  }
}

export async function publishArticleById(articleId: string): Promise<PublishResult> {
  const [article] = await db.select().from(articles).where(eq(articles.id, articleId));
  if (!article) throw new PublishError("Article not found", 404);

  const tmpl = getTemplate(article.template);

  if (tmpl) {
    // ① 体験スロット充足チェック
    if (tmpl.experienceSlots.length > 0) {
      const exps = await db.select().from(experiences).where(eq(experiences.articleId, articleId));
      const missing = tmpl.experienceSlots.filter(
        (slot) => !exps.find((e) => e.label === slot && e.completed)
      );
      if (missing.length > 0) {
        throw new PublishError(`体験スロットが未充足です: ${missing.join(", ")}`, 422);
      }

      // ② [EXPERIENCE:*] 置換
      let bodyMd = article.bodyMd;
      for (const exp of exps) {
        const replacement = [exp.choice, exp.note].filter(Boolean).join(" — ");
        const re = new RegExp(`\\[EXPERIENCE:${exp.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`, "g");
        bodyMd = bodyMd.replace(re, replacement || `（${exp.label}）`);
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

      const html = injectAffiliateRel(bodyHtml);

      if (!process.env.WP_BASE_URL) {
        await db.update(articles).set({ status: "published", publishedAt: new Date() }).where(eq(articles.id, articleId));
        return { skipped: "WP_BASE_URL not set", status: "published" };
      }

      const wpResult = await createDraftPost({ title: article.title, content: html, status: "draft" });
      await db.update(articles).set({ status: "published", wpPostId: wpResult.id, publishedAt: new Date() }).where(eq(articles.id, articleId));
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
  const rawHtml = await marked(bodyMd);
  const html = injectAffiliateRel(rawHtml);

  if (!process.env.WP_BASE_URL) {
    await db.update(articles).set({ status: "published", publishedAt: new Date() }).where(eq(articles.id, articleId));
    return { skipped: "WP_BASE_URL not set", status: "published" };
  }

  const wpResult = await createDraftPost({ title: article.title, content: html, status: "draft" });
  await db.update(articles).set({ status: "published", wpPostId: wpResult.id, publishedAt: new Date() }).where(eq(articles.id, articleId));
  return { wpPostId: wpResult.id, link: wpResult.link, status: "published" };
}
