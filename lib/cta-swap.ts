// 記事HTML内のアフィリ広告CTAブロックを検出・差し替えるユーティリティ。
// 旧形式(<p style="text-align:center"><a rel="nofollow ...">…</a></p>)と
// 新形式(wrapAffiliateの<div ... rel="nofollow sponsored">…</div>)の両方に対応。

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

// pos にあるリンクを内包する「最も内側の <p> または <div> ブロック」の範囲を返す。
function enclosingBlock(html: string, pos: number): { start: number; end: number } | null {
  let best: { start: number; end: number } | null = null;
  for (const tag of ["div", "p"] as const) {
    let from = pos;
    while (true) {
      const idx = html.lastIndexOf(`<${tag}`, from);
      if (idx === -1) break;
      const after = html[idx + 1 + tag.length];
      if (after !== undefined && !/[\s>]/.test(after)) { from = idx - 1; continue; }
      const end = tag === "div" ? balancedDivEnd(html, idx)
        : (() => { const c = html.indexOf("</p>", idx); return c === -1 ? -1 : c + 4; })();
      if (end > pos) { if (!best || idx > best.start) best = { start: idx, end }; break; }
      from = idx - 1;
    }
  }
  return best;
}

export function replaceCtaBlocks(rawHtml: string, newCta: string): { html: string; count: number } {
  // 開示文の<p>（「〜アフィリエイトパートナーです」等）を除去
  let html = rawHtml.replace(/<p[^>]*>[^<]*アフィリエイト(パートナー|プログラム)[^<]*<\/p>\s*/gi, "");

  const ranges: { start: number; end: number }[] = [];
  const aRe = /<a\s[^>]*href="https?:\/\/[^"]+"[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = aRe.exec(html))) {
    const tag = m[0];
    if (!/rel="[^"]*(nofollow|sponsored)[^"]*"/i.test(tag)) continue;
    const block = enclosingBlock(html, m.index) ?? { start: m.index, end: (() => { const c = html.indexOf("</a>", m.index); return c === -1 ? m.index + tag.length : c + 4; })() };
    if (!ranges.some(r => r.start === block.start)) ranges.push(block);
    aRe.lastIndex = block.end;
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
