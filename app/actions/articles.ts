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

  await db
    .update(judgments)
    .set({ tradeView, position, uniqueTake, completed, updatedAt: new Date() })
    .where(eq(judgments.articleId, articleId));

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
