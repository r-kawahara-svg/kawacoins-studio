import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articles, topics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateEyecatchPng } from "@/lib/eyecatch";
import { uploadMedia, setFeaturedMedia } from "@/lib/wp";
import { publishArticleById } from "@/lib/publish";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: articleId } = await params;

  const [article] = await db.select().from(articles).where(eq(articles.id, articleId));
  if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });

  const topicRow = article.topicId
    ? await db.select({ keyword: topics.keyword, summary: topics.summary })
        .from(topics).where(eq(topics.id, article.topicId)).limit(1).then(r => r[0])
    : undefined;

  // WP投稿済みの場合: アイキャッチだけ再生成・更新
  if (article.wpPostId) {
    const eyecatchOpts = {
      keyword: topicRow?.keyword ?? undefined,
      description: topicRow?.summary?.slice(0, 50) ?? undefined,
    };
    const png = await generateEyecatchPng(article.title, article.template, eyecatchOpts);
    const filename = `eyecatch-${article.id.slice(0, 8)}-${Date.now()}.png`;
    const mediaId = await uploadMedia(png, filename);
    await setFeaturedMedia(article.wpPostId, mediaId);
    return NextResponse.json({ ok: true, action: "eyecatch_updated", mediaId });
  }

  // WP未連携の場合: フル再投稿
  try {
    const result = await publishArticleById(articleId);
    return NextResponse.json({ ok: true, action: "republished", ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
