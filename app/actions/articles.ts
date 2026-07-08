"use server";

import { db } from "@/db";
import { articles, judgments, experiences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { publishArticleById, PublishError } from "@/lib/publish";

export async function updateJudgment(formData: FormData) {
  const articleId = formData.get("articleId") as string;
  const tradeView = formData.get("tradeView") as string;
  const position = formData.get("position") as string;
  const uniqueTake = formData.get("uniqueTake") as string;

  const completed = !!(tradeView?.trim() && position?.trim() && uniqueTake?.trim());

  // judgment レコードが存在しない記事（テンプレート記事など）も UPSERT で対応
  const existing = await db
    .select({ id: judgments.id })
    .from(judgments)
    .where(eq(judgments.articleId, articleId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(judgments)
      .set({ tradeView, position, uniqueTake, completed, updatedAt: new Date() })
      .where(eq(judgments.articleId, articleId));
  } else {
    await db
      .insert(judgments)
      .values({ articleId, tradeView, position, uniqueTake, completed });
  }

  revalidatePath(`/articles/${articleId}`);
}

// 記事に入れる広告（アフィリ）を選び直す。bodyMd の [AFFILIATE:*] を
// [AFFILIATE:id:<programId>] に置換。無ければ「まとめ」直前に挿入する。
export async function setArticleAffiliate(formData: FormData) {
  const articleId = formData.get("articleId") as string;
  const programId = formData.get("programId") as string;
  if (!articleId || !programId) return;

  const [article] = await db.select({ bodyMd: articles.bodyMd }).from(articles).where(eq(articles.id, articleId));
  if (!article) return;

  const tag = `[AFFILIATE:id:${programId}]`;
  let body = article.bodyMd;
  if (/\[AFFILIATE:[^\]]+\]/.test(body)) {
    // 既存の広告プレースホルダを全て新しいものに置換（重複は公開時に1つへ整理される）
    body = body.replace(/\[AFFILIATE:[^\]]+\]/g, tag);
  } else {
    // 無ければ「## まとめ」直前、無ければ末尾に挿入
    const m = body.match(/\n#{2,3}\s*まとめ/);
    if (m && m.index != null) body = body.slice(0, m.index) + `\n\n${tag}\n` + body.slice(m.index);
    else body = body + `\n\n${tag}\n`;
  }

  await db.update(articles).set({ bodyMd: body }).where(eq(articles.id, articleId));
  revalidatePath(`/articles/${articleId}`);
}

export async function publishArticle(formData: FormData) {
  const articleId = formData.get("articleId") as string;
  try {
    await publishArticleById(articleId);
  } catch (e) {
    if (e instanceof PublishError) {
      throw new Error(e.userMessage);
    }
    throw e;
  }
  revalidatePath(`/articles/${articleId}`);
  revalidatePath("/review");
  revalidatePath("/");
}

/**
 * 記事をDBから削除する。
 * WP投稿済み(wpPostId あり)の場合もDBレコードだけ削除し、WP側は触らない。
 */
export async function deleteArticle(formData: FormData) {
  const articleId = formData.get("articleId") as string;
  if (!articleId) return;

  // 存在確認
  const [article] = await db
    .select({ id: articles.id, wpPostId: articles.wpPostId })
    .from(articles)
    .where(eq(articles.id, articleId));
  if (!article) return;

  // 関連レコードを先に削除（FK制約対応）
  await db.delete(experiences).where(eq(experiences.articleId, articleId));
  await db.delete(judgments).where(eq(judgments.articleId, articleId));
  await db.delete(articles).where(eq(articles.id, articleId));

  revalidatePath("/");
  revalidatePath("/review");
  redirect("/review");
}
