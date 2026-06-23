import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articles, judgments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { marked } from "marked";
import { createDraftPost, injectAffiliateRel } from "@/lib/wp";
import { isJudgmentComplete } from "@/lib/gate";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Fetch article
  const [article] = await db
    .select()
    .from(articles)
    .where(eq(articles.id, id));

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  // Fetch judgment
  const [judgment] = await db
    .select()
    .from(judgments)
    .where(eq(judgments.articleId, id));

  if (!judgment || !isJudgmentComplete(judgment)) {
    return NextResponse.json(
      { error: "Judgment gate not complete" },
      { status: 400 }
    );
  }

  // Substitute JUDGMENT placeholders with actual judgment text
  let bodyMd = article.bodyMd
    .replace(/\[JUDGMENT:trade\]/g, judgment.tradeView ?? "")
    .replace(/\[JUDGMENT:position\]/g, judgment.position ?? "")
    .replace(/\[JUDGMENT:take\]/g, judgment.uniqueTake ?? "");

  // Remove AFFILIATE placeholders (real links handled separately in Phase 2)
  bodyMd = bodyMd.replace(/\[AFFILIATE:[^\]]+\]/g, "");

  // Convert to HTML
  const rawHtml = await marked(bodyMd);
  const html = injectAffiliateRel(rawHtml);

  // Create WordPress draft
  const wpResult = await createDraftPost({
    title: article.title,
    content: html,
    status: "draft",
  });

  // Update article status and wpPostId
  await db
    .update(articles)
    .set({
      status: "published",
      wpPostId: wpResult.id,
      publishedAt: new Date(),
    })
    .where(eq(articles.id, id));

  return NextResponse.json({ wpPostId: wpResult.id, link: wpResult.link });
}
