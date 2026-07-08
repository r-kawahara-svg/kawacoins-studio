import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { affiliatePrograms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getWpPost, updatePostContent } from "@/lib/wp";
import { wrapAffiliate } from "@/lib/affiliate";
import { replaceCtaBlocks } from "@/lib/cta-swap";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { postId, programId } = await req.json() as { postId?: number; programId?: string };
    if (!postId || !programId) return NextResponse.json({ error: "postId と programId が必要です" }, { status: 400 });

    const [program] = await db.select().from(affiliatePrograms).where(eq(affiliatePrograms.id, programId));
    if (!program) return NextResponse.json({ error: "アフィリプログラムが見つかりません" }, { status: 404 });

    // 新しいCTA HTMLを生成
    const anchorMatch = program.htmlSnippet.match(/<a [^>]*>([^<]+)<\/a>/i);
    const anchorText = anchorMatch?.[1]?.trim() ?? "";
    const newCta = wrapAffiliate(program.htmlSnippet, program.name, anchorText, program.strength);
    if (!newCta) return NextResponse.json({ error: "CTAの生成に失敗しました（スニペットを確認してください）" }, { status: 400 });

    const { contentHtml } = await getWpPost(postId);
    const { html, count } = replaceCtaBlocks(contentHtml, newCta);
    if (count === 0) {
      return NextResponse.json({ error: "記事内にアフィリ広告が見つかりませんでした（差し替え対象なし）" }, { status: 404 });
    }

    await updatePostContent(postId, { content: html });
    return NextResponse.json({ ok: true, replaced: count, program: program.name });
  } catch (e) {
    console.error("[wp-swap-affiliate] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
