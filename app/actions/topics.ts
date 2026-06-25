"use server";

import { db } from "@/db";
import { topics } from "@/db/schema";
import { revalidatePath } from "next/cache";
import type { TopicSuggestion } from "@/app/api/topics/suggest/route";

export async function adoptSuggestedTopic(suggestion: TopicSuggestion) {
  await db.insert(topics).values({
    title: suggestion.title,
    source: suggestion.source,
    keyword: suggestion.keyword,
    summary: suggestion.summary,
    revenueScore: suggestion.revenue_score,
    template: suggestion.template,
    competition: "mid",
    status: "new",
  });
  revalidatePath("/topics");
}

export async function addTopic(formData: FormData) {
  const title = (formData.get("title") as string).trim();
  if (!title) return;

  await db.insert(topics).values({
    title,
    source: (formData.get("source") as string) || "idea",
    summary: (formData.get("summary") as string) || null,
    sourceUrl: (formData.get("source_url") as string) || null,
    keyword: (formData.get("keyword") as string) || null,
    revenueScore: parseInt(formData.get("revenue_score") as string) || 3,
    competition: (formData.get("competition") as string) || "mid",
    status: "new",
  });

  revalidatePath("/topics");
}
