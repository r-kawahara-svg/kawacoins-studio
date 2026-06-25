/**
 * 図表レンダリングエンジン
 * visuals jsonb → WP本文に埋め込むHTML/インラインSVG
 * 外部JS・外部画像依存なし。WP本文に直接入れて完結する。
 */

export interface VisualTable {
  id: string;
  kind: "table";
  title: string;
  caption?: string;
  source?: string;
  columns: string[];
  rows: string[][];
}

export interface VisualSteps {
  id: string;
  kind: "steps";
  title: string;
  caption?: string;
  source?: string;
  steps: { step: number; label: string; detail: string }[];
}

export interface VisualChart {
  id: string;
  kind: "chart";
  title: string;
  caption?: string;
  source?: string;
  series: { label: string; values: number[] }[];
}

export type Visual = VisualTable | VisualSteps | VisualChart;

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderTable(v: VisualTable): string {
  const headerCells = v.columns.map((c) => `<th style="background:#1a3a2a;color:#fff;padding:8px 12px;text-align:left;font-size:13px;font-weight:600;white-space:nowrap">${escHtml(c)}</th>`).join("");
  const bodyRows = v.rows.map((row, i) => {
    const bg = i % 2 === 0 ? "#f8faf9" : "#fff";
    const cells = row.map((cell) => `<td style="padding:7px 12px;font-size:13px;color:#2b3a52;border-bottom:1px solid #e5eae6">${escHtml(cell)}</td>`).join("");
    return `<tr style="background:${bg}">${cells}</tr>`;
  }).join("");

  const caption = v.caption ? `<p style="font-size:12px;color:#697587;margin:6px 0 0">${escHtml(v.caption)}</p>` : "";
  const source = v.source ? `<p style="font-size:11px;color:#9ba8b5;margin:4px 0 0">出典: ${escHtml(v.source)}</p>` : "";

  return `<div style="overflow-x:auto;margin:20px 0">
<p style="font-size:14px;font-weight:700;color:#161d2b;margin:0 0 8px">${escHtml(v.title)}</p>
<table style="width:100%;border-collapse:collapse;font-family:sans-serif">
<thead><tr>${headerCells}</tr></thead>
<tbody>${bodyRows}</tbody>
</table>
${caption}${source}
</div>`;
}

export function renderSteps(v: VisualSteps): string {
  const items = v.steps.map((s) => `
<div style="display:flex;gap:14px;margin-bottom:16px;align-items:flex-start">
  <div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:#1a3a2a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700">${s.step}</div>
  <div>
    <div style="font-size:14px;font-weight:700;color:#161d2b;margin-bottom:3px">${escHtml(s.label)}</div>
    <div style="font-size:13px;color:#2b3a52;line-height:1.6">${escHtml(s.detail)}</div>
  </div>
</div>`).join("");

  const caption = v.caption ? `<p style="font-size:12px;color:#697587;margin:6px 0 0">${escHtml(v.caption)}</p>` : "";

  return `<div style="margin:20px 0;padding:20px 22px;background:#f8faf9;border:1px solid #dce1e8;border-radius:12px">
<p style="font-size:14px;font-weight:700;color:#161d2b;margin:0 0 16px">${escHtml(v.title)}</p>
${items}
${caption}
</div>`;
}

export function renderChart(v: VisualChart): string {
  if (!v.series || v.series.length === 0) return "";

  // 最初のシリーズのみバーチャートでレンダリング
  const series = v.series[0];
  if (!series || series.values.length === 0) return "";

  const maxVal = Math.max(...series.values.filter((n) => !isNaN(n)), 1);
  const barW = 36;
  const gap = 14;
  const chartH = 140;
  const padLeft = 48;
  const padBottom = 40;
  const svgW = padLeft + series.values.length * (barW + gap) + 20;
  const svgH = chartH + padBottom + 10;

  // X labels (use second series label or index)
  const xLabels = v.series.length > 1
    ? v.series[1].values.map(String)
    : series.values.map((_, i) => String(i + 1));

  const bars = series.values.map((val, i) => {
    const h = isNaN(val) ? 0 : Math.round((val / maxVal) * chartH);
    const x = padLeft + i * (barW + gap);
    const y = chartH - h + 10;
    const label = isNaN(val) ? "" : String(val);
    const xLabel = xLabels[i] ?? String(i + 1);
    return `
<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="#1a3a2a" rx="3"/>
<text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-size="10" fill="#2b3a52">${escHtml(label)}</text>
<text x="${x + barW / 2}" y="${chartH + padBottom - 10}" text-anchor="middle" font-size="10" fill="#697587">${escHtml(xLabel)}</text>`;
  }).join("");

  const caption = v.caption ? `<p style="font-size:12px;color:#697587;margin:6px 0 0">${escHtml(v.caption)}</p>` : "";
  const source = v.source ? `<p style="font-size:11px;color:#9ba8b5;margin:4px 0 0">出典: ${escHtml(v.source)}</p>` : "";

  return `<div style="margin:20px 0;overflow-x:auto">
<p style="font-size:14px;font-weight:700;color:#161d2b;margin:0 0 8px">${escHtml(v.title)}</p>
<svg viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}" style="display:block;max-width:100%" xmlns="http://www.w3.org/2000/svg">
${bars}
</svg>
${caption}${source}
</div>`;
}

/**
 * プレースホルダ [TABLE:ラベル], [STEPS:ラベル], [CHART:ラベル] を
 * visuals データで置換してHTML化する。
 * データが見つからない場合はプレースホルダを安全に除去する。
 */
export function applyVisuals(html: string, visuals: Visual[]): string {
  // TABLE
  html = html.replace(/\[TABLE:([^\]]+)\]/g, (_, label: string) => {
    const v = visuals.find((x) => x.kind === "table" && x.title.includes(label.trim())) as VisualTable | undefined;
    if (!v || !v.columns?.length) return `<p style="color:#9ba8b5;font-size:12px">(表は準備中: ${escHtml(label)})</p>`;
    return renderTable(v);
  });

  // STEPS
  html = html.replace(/\[STEPS:([^\]]+)\]/g, (_, label: string) => {
    const v = visuals.find((x) => x.kind === "steps" && x.title.includes(label.trim())) as VisualSteps | undefined;
    if (!v || !v.steps?.length) return `<p style="color:#9ba8b5;font-size:12px">(ステップ図は準備中: ${escHtml(label)})</p>`;
    return renderSteps(v);
  });

  // CHART — データなし・数値なしの場合はプレースホルダごと除去（壊れた状態で残さない）
  html = html.replace(/\[CHART:([^\]]+)\]/g, (_, label: string) => {
    const v = visuals.find((x) => x.kind === "chart" && x.title.includes(label.trim())) as VisualChart | undefined;
    if (!v || !v.series?.length) return "";
    const hasNumbers = v.series.some(s => s.values?.some(n => !isNaN(n) && n !== 0));
    if (!hasNumbers) return "";
    return renderChart(v);
  });

  return html;
}

/**
 * FAQ [{question, answer}] → HTML dl リスト
 */
export function renderFaq(faq: { question: string; answer: string }[]): string {
  if (!faq || faq.length === 0) return "";
  const items = faq.map((f) => `
<div style="margin-bottom:14px;padding:14px 16px;background:#f8faf9;border-left:3px solid #1a3a2a;border-radius:0 8px 8px 0">
  <p style="font-size:14px;font-weight:700;color:#161d2b;margin:0 0 6px">Q. ${escHtml(f.question)}</p>
  <p style="font-size:13px;color:#2b3a52;margin:0;line-height:1.65">A. ${escHtml(f.answer)}</p>
</div>`).join("");

  return `<div style="margin:20px 0">
<p style="font-size:15px;font-weight:700;color:#161d2b;margin:0 0 12px">よくある質問</p>
${items}
</div>`;
}
