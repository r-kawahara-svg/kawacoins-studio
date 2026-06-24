"use server";

import { db } from "@/db";
import { judgments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
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
