import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articles, topics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateEyecatchPng } from "@/lib/eyecatch";
import { getWpPost, uploadMedia, setFeaturedMedia } from "@/lib/wp";

export const dynamic = "force-dynamic";

// WordPress投稿のアイキャッチを再生成して差し替える。
// DBに該当記事(wpPostId一致)があればテンプレ/キーワードを活用、無ければタイトルのみ。
export async function POST(req: NextRequest) {
  try {
    const { postId } = await req.json() as { postId?: number };
    if (!postId) return NextResponse.json({ error: "postId が必要です" }, { status: 400 });

    // DBに紐づく記事があれば取得（より良いアイキャッチ用）
    const [article] = await db.select().from(articles).where(eq(articles.wpPostId, postId)).limit(1);

    let title = article?.title ?? "";
    let template = article?.template ?? null;
    let keyword: string | undefined;
    let description: string | undefined;

    if (article?.topicId) {
      const t = await db.select({ keyword: topics.keyword, summary: topics.summary })
        .from(topics).where(eq(topics.id, article.topicId)).limit(1).then(r => r[0]);
      keyword = t?.keyword ?? undefined;
      description = t?.summary?.slice(0, 50) ?? undefined;
    }

    // タイトルが無ければWPから取得
    if (!title) {
      const wp = await getWpPost(postId);
      title = wp.title;
    }
    if (!title) return NextResponse.json({ error: "記事タイトルが取得できませんでした" }, { status: 404 });

    const png = await generateEyecatchPng(title, template, { keyword, description });
    const mediaId = await uploadMedia(png, `eyecatch-${postId}-${Date.now()}.png`);
    await setFeaturedMedia(postId, mediaId);

    return NextResponse.json({ ok: true, postId, mediaId });
  } catch (e) {
    console.error("[wp-eyecatch] failed:", e instanceof Error ? e.stack ?? e.message : e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
