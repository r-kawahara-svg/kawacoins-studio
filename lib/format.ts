/**
 * JIN:R 装飾 HTML 後処理
 * publish パイプラインで marked 変換後の HTML に適用する。
 *
 * Claude が出力するプレースホルダ:
 *   [JINBOX:note]内容[/JINBOX]   → 緑左ボーダーのノートボックス
 *   [JINBOX:warn]内容[/JINBOX]   → 赤枠の注意ボックス
 *   [JINBOX:point]内容[/JINBOX]  → 青枠のポイントボックス
 *   [CALLOUT]内容[/CALLOUT]      → 黄色吹き出しコールアウト
 *   <mark>text</mark>            → そのまま（JIN:Rがスタイル付与。ない場合は inline style で補完）
 */

export function applyJinRFormat(html: string): string {
  // ── [JINBOX:note] ─────────────────────────────────────────────
  html = html.replace(
    /\[JINBOX:note\]([\s\S]*?)\[\/JINBOX\]/gi,
    (_, content) =>
      `<div style="border-left:4px solid #38a169;background:#f0fff4;padding:14px 18px;margin:20px 0;border-radius:0 8px 8px 0">${content.trim()}</div>`
  );

  // ── [JINBOX:warn] ─────────────────────────────────────────────
  html = html.replace(
    /\[JINBOX:warn\]([\s\S]*?)\[\/JINBOX\]/gi,
    (_, content) =>
      `<div style="border:2px solid #feb2b2;background:#fff5f5;padding:14px 18px;margin:20px 0;border-radius:8px">${content.trim()}</div>`
  );

  // ── [JINBOX:point] ────────────────────────────────────────────
  html = html.replace(
    /\[JINBOX:point\]([\s\S]*?)\[\/JINBOX\]/gi,
    (_, content) =>
      `<div style="border-left:4px solid #3182ce;background:#ebf8ff;padding:14px 18px;margin:20px 0;border-radius:0 8px 8px 0">${content.trim()}</div>`
  );

  // ── [CALLOUT] ─────────────────────────────────────────────────
  html = html.replace(
    /\[CALLOUT\]([\s\S]*?)\[\/CALLOUT\]/gi,
    (_, content) =>
      `<div style="background:#fffbeb;border:2px solid #f6c90e;border-radius:12px;padding:14px 18px;margin:20px 0;font-style:italic">${content.trim()}</div>`
  );

  // ── <mark> に inline style を補完（テーマ未対応の保険）─────────
  // JIN:Rが mark をスタイルするなら上書きされるだけで問題なし
  html = html.replace(
    /<mark>([\s\S]*?)<\/mark>/gi,
    `<mark style="background:#fff176;padding:1px 4px;border-radius:2px;font-style:normal">$1</mark>`
  );

  // ── 空の <p></p> 除去 ─────────────────────────────────────────
  html = html.replace(/<p>\s*<\/p>\n?/g, "");

  return html;
}
