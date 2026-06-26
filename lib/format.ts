/**
 * JIN:R 装飾 HTML 後処理
 * publish パイプラインで marked 変換後の HTML に適用する。
 *
 * Claude が出力するプレースホルダ:
 *   [JINBOX:note]内容[/JINBOX]   → 緑左ボーダーのノートボックス
 *   [JINBOX:warn]内容[/JINBOX]   → 赤枠の注意ボックス
 *   [JINBOX:point]内容[/JINBOX]  → 青枠のポイントボックス
 *   [CALLOUT]内容[/CALLOUT]      → 黄色吹き出しコールアウト
 *   [TALK:reader]内容[/TALK]     → 読者アイコンの左吹き出し（素朴な疑問など）
 *   [TALK:author]内容[/TALK]     → 筆者アイコンの右吹き出し（回答・本音など）
 *   <mark>text</mark>            → そのまま（JIN:Rがスタイル付与。ない場合は inline style で補完）
 */

// 会話吹き出し1つ分のHTMLを生成（JIN:Rのアバター設定に依存しない自己完結HTML）
function talkBubble(speaker: "reader" | "author", inner: string): string {
  // marked が付けた <p> ラップを除去してインライン化
  const content = inner.trim().replace(/^<p>/i, "").replace(/<\/p>\s*$/i, "").trim();

  const isReader = speaker === "reader";
  const emoji   = isReader ? "🤔" : "😊";
  const name    = isReader ? "読者" : "カワコイン";
  const avatarBg = isReader ? "#eef2f7" : "#e6f6f2";
  const border   = isReader ? "#cbd5e0" : "#9fd9cc";
  const bubbleBg = isReader ? "#f7fafc" : "#effaf6";
  const dir      = isReader ? "row" : "row-reverse";

  return `<div style="display:flex;flex-direction:${dir};align-items:flex-start;gap:10px;margin:18px 0">
  <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:2px;width:52px">
    <div style="width:48px;height:48px;border-radius:50%;background:${avatarBg};border:2px solid ${border};display:flex;align-items:center;justify-content:center;font-size:24px">${emoji}</div>
    <span style="font-size:10px;color:#718096">${name}</span>
  </div>
  <div style="max-width:78%;background:${bubbleBg};border:1px solid ${border};border-radius:12px;padding:11px 15px;font-size:15px;line-height:1.7">${content}</div>
</div>`;
}

export function applyJinRFormat(html: string): string {
  // ── [INSIGHT] 筆者独自の考察（コンサル/投資視点）ボックス ──────
  html = html.replace(
    /\[INSIGHT\]([\s\S]*?)\[\/INSIGHT\]/gi,
    (_, content: string) => {
      const inner = content.trim().replace(/^<p>/i, "").replace(/<\/p>\s*$/i, "").trim();
      return `<div style="border:1px solid #c7b9e8;background:#f6f2fc;border-radius:12px;padding:14px 18px;margin:22px 0">
  <div style="font-size:12px;font-weight:700;color:#6d28d9;margin-bottom:6px;letter-spacing:0.4px">💡 コンサル視点の考察</div>
  <div style="font-size:15px;line-height:1.75;color:#2d2a3a">${inner}</div>
</div>`;
    }
  );

  // ── [TALK:reader] / [TALK:author] 会話吹き出し ────────────────
  html = html.replace(
    /\[TALK:(reader|author)\]([\s\S]*?)\[\/TALK\]/gi,
    (_, speaker: string, content: string) => talkBubble(speaker.toLowerCase() as "reader" | "author", content)
  );

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

  // ── 取りこぼしタグの除去（閉じ忘れ等の保険）──────────────────
  html = html.replace(/\[\/?INSIGHT\]/gi, "");
  html = html.replace(/\[\/?TALK(?::[a-z]+)?\]/gi, "");

  // ── 空の <p></p> 除去 ─────────────────────────────────────────
  html = html.replace(/<p>\s*<\/p>\n?/g, "");

  return html;
}
