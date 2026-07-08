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

// sponsoredリンクを内包する CTA ブロック(div)を先に全部特定し、
// 先頭を newCta に、2つ目以降を削除（置換後の再走査で新CTAを消さないよう一括処理）。
function replaceCtaBlocks(html: string, newCta: string): { html: string; count: number } {
  const ranges: { start: number; end: number }[] = [];
  const relRe = /rel="[^"]*sponsored[^"]*"/ig;
  let m: RegExpExecArray | null;
  while ((m = relRe.exec(html))) {
    const linkIdx = m.index;
    let start = -1, from = linkIdx;
    while (true) {
      const idx = html.lastIndexOf("<div", from);
      if (idx === -1) break;
      const end = balancedDivEnd(html, idx);
      if (end > linkIdx) { start = idx; break; }
      from = idx - 1;
    }
    if (start === -1) continue;
    const end = balancedDivEnd(html, start);
    if (end === -1) continue;
    if (!ranges.some(r => r.start === start)) ranges.push({ start, end });
    relRe.lastIndex = end; // このブロックを飛ばして次へ
  }
  ranges.sort((a, b) => a.start - b.start);
  if (ranges.length === 0) return { html, count: 0 };

  let result = "", prev = 0;
  ranges.forEach((r, i) => {
    result += html.slice(prev, r.start) + (i === 0 ? newCta : "");
    prev = r.end;
  });
  result += html.slice(prev);
  return { html: result, count: ranges.length };
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
