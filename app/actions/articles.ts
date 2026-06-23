"use server";

import { db } from "@/db";
import { articles, judgments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateJudgment(formData: FormData) {
  const articleId = formData.get("articleId") as string;
  const tradeView = formData.get("tradeView") as string;
  const position = formData.get("position") as string;
  const uniqueTake = formData.get("uniqueTake") as string;

  const completed = !!(tradeView?.trim() && position?.trim() && uniqueTake?.trim());

  await db
    .update(judgments)
    .set({ tradeView, position, uniqueTake, completed, updatedAt: new Date() })
    .where(eq(judgments.articleId, articleId));

  revalidatePath(`/articles/${articleId}`);
}

export async function publishArticle(formData: FormData) {
  const articleId = formData.get("articleId") as string;

  await db
    .update(articles)
    .set({ status: "published", publishedAt: new Date() })
    .where(eq(articles.id, articleId));

  revalidatePath(`/articles/${articleId}`);
  revalidatePath("/");
}
