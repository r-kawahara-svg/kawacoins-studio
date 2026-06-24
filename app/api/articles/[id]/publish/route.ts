import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articles, judgments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { marked } from "marked";
import { createDraftPost, injectAffiliateRel } from "@/lib/wp";
import { isJudgmentComplete } from "@/lib/gate";
import { replaceAffiliatePlaceholders } from "@/lib/affiliate";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [article] = await db
    .select()
    .from(articles)
    .where(eq(articles.id, id));

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const [judgment] = await db
    .select()
    .from(judgments)
    .where(eq(judgments.articleId, id));

  if (!judgment || !isJudgmentComplete(judgment)) {
    return NextResponse.json(
      { error: "判断ゲートが未完了です" },
      { status: 422 }
    );
  }

  // JUDGMENT プレースホルダ置換
  let bodyMd = article.bodyMd
    .replace(/\[JUDGMENT:trade\]/g, judgment.tradeView ?? "")
    .replace(/\[JUDGMENT:position\]/g, judgment.position ?? "")
    .replace(/\[JUDGMENT:take\]/g, judgment.uniqueTake ?? "");

  // AFFILIATE プレースホルダ置換（DB から広告取得、text優先）
  bodyMd = await replaceAffiliatePlaceholders(bodyMd);

  // Markdown → HTML
  const rawHtml = await marked(bodyMd);
  // 通常リンクにも rel="sponsored nofollow" を付与（既存の injectAffiliateRel）
  const html = injectAffiliateRel(rawHtml);

  const wpResult = await createDraftPost({
    title: article.title,
    content: html,
    status: "draft",
  });

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
