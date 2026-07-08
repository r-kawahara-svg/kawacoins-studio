import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { affiliatePrograms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getWpPost, updatePostContent } from "@/lib/wp";
import { wrapAffiliate } from "@/lib/affiliate";

export const dynamic = "force-dynamic";

// <div ...> の対応閉じ位置を返す（入れ子対応）
function balancedDivEnd(html: string, start: number): number {
  const re = /<div\b|<\/div>/gi;
  re.lastIndex = start;
  let depth = 0, m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[0].toLowerCase().startsWith("</")) { depth--; if (depth === 0) return re.lastIndex; }
    else depth++;
  }
  return -1;
}

// sponsoredリンクを内包する CTA ブロック(div)を newCta に差し替える。2つ目以降の重複は削除。
function replaceCtaBlocks(html: string, newCta: string): { html: string; count: number } {
  let result = html, count = 0, guard = 0;
  const relRe = /rel="[^"]*sponsored[^"]*"/i;
  while (guard++ < 12) {
    const m = result.search(relRe);
    if (m === -1) break;
    // リンクを内包する最も内側の <div を探す
    let start = -1, from = m;
    while (true) {
      const idx = result.lastIndexOf("<div", from);
      if (idx === -1) break;
      const end = balancedDivEnd(result, idx);
      if (end > m) { start = idx; break; }
      from = idx - 1;
    }
    if (start === -1) break;
    const end = balancedDivEnd(result, start);
    if (end === -1) break;
    result = result.slice(0, start) + (count === 0 ? newCta : "") + result.slice(end);
    count++;
  }
  return { html: result, count };
}

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
