/**
 * アイキャッチ画像生成 (SVG → PNG)
 * OGP標準サイズ 1200×630px
 * デザイン: テーマカラーグラデーション + 白二重枠 + 吹き出し + キーワードタイル
 */

type Theme = {
  gradA: string;  // グラデーション上端
  gradB: string;  // グラデーション中間
  gradC: string;  // グラデーション下端
  accent: string; // タイル・吹き出しテキスト用
  tileBase: string; // キーワードタイルベース色
  bubble: string; // 吹き出しテキスト色
  tag: string;    // デフォルト吹き出しテキスト
};

const THEMES: Record<string, Theme> = {
  T6: {
    gradA: "#2b5c8c", gradB: "#1e4570", gradC: "#102b4f",
    accent: "#90c8f0", tileBase: "#2d71b8", bubble: "#102b4f",
    tag: "制度をわかりやすく",
  },
  T1: {
    gradA: "#1c8070", gradB: "#0f6b5a", gradC: "#083f35",
    accent: "#7ee8d4", tileBase: "#1a9a82", bubble: "#083f35",
    tag: "実体験レポート！",
  },
  T2: {
    gradA: "#1f5099", gradB: "#163a78", gradC: "#0b2455",
    accent: "#7eb5f0", tileBase: "#2264cc", bubble: "#0b2455",
    tag: "徹底比較まとめ",
  },
  T3: {
    gradA: "#207840", gradB: "#155f30", gradC: "#0a4020",
    accent: "#70cc88", tileBase: "#24954c", bubble: "#0a4020",
    tag: "完全攻略ガイド",
  },
  T4: {
    gradA: "#363e7e", gradB: "#272d65", gradC: "#181d4c",
    accent: "#9aa8e0", tileBase: "#3d4fb8", bubble: "#181d4c",
    tag: "決算速報分析！",
  },
  T5: {
    gradA: "#882424", gradB: "#6a1818", gradC: "#4c0f0f",
    accent: "#f0a0a0", tileBase: "#b83030", bubble: "#4c0f0f",
    tag: "失敗から学ぶ",
  },
};

const DEFAULT_THEME: Theme = {
  gradA: "#223348", gradB: "#182636", gradC: "#0e1a24",
  accent: "#8ab4cc", tileBase: "#2c5070", bubble: "#0e1a24",
  tag: "kawacoin的まとめ",
};

// ─── 文字幅推定 ───────────────────────────────────────────────────
function estimateWidth(text: string, fontSize: number): number {
  let w = 0;
  for (const ch of [...text]) {
    const code = ch.codePointAt(0) ?? 0;
    // ASCII以外（日本語等）はフルwidth扱い
    w += code > 0x7e ? fontSize : fontSize * 0.62;
  }
  return w;
}

// ─── タイトル行分割 ───────────────────────────────────────────────
interface TitleLayout { lines: string[]; fontSize: number; lineH: number; }

const BREAK_CHARS = new Set([...Array.from("　・／、。…— ")]);

function splitAt(str: string, idealPos: number): [string, string] {
  // ideal位置の近くの区切り文字で割る
  for (let d = 0; d <= 8; d++) {
    for (const i of [idealPos + d, idealPos - d]) {
      if (i > 0 && i < str.length) {
        if (BREAK_CHARS.has(str[i - 1])) return [str.slice(0, i), str.slice(i)];
        if (BREAK_CHARS.has(str[i]))     return [str.slice(0, i + 1), str.slice(i + 1)];
      }
    }
  }
  return [str.slice(0, idealPos), str.slice(idealPos)];
}

function layoutTitle(title: string): TitleLayout {
  const MAX_W = 1060; // 左右パディング込みの有効幅

  // 1行で収まるか試す
  for (const fs of [80, 72, 64, 56, 50]) {
    if (estimateWidth(title, fs) <= MAX_W) {
      return { lines: [title], fontSize: fs, lineH: Math.round(fs * 1.38) };
    }
  }

  // 2行
  for (const fs of [70, 62, 56, 50, 44]) {
    const [a, b] = splitAt(title, Math.ceil(title.length / 2));
    if (estimateWidth(a, fs) <= MAX_W && estimateWidth(b, fs) <= MAX_W) {
      return { lines: [a, b].filter(Boolean), fontSize: fs, lineH: Math.round(fs * 1.38) };
    }
  }

  // 3行（長いタイトル）
  for (const fs of [50, 44, 38]) {
    const [a, rest] = splitAt(title, Math.ceil(title.length / 3));
    const [b, c]    = splitAt(rest, Math.ceil(rest.length / 2));
    const lines = [a, b, c].filter(Boolean);
    if (lines.every(l => estimateWidth(l, fs) <= MAX_W)) {
      return { lines, fontSize: fs, lineH: Math.round(fs * 1.36) };
    }
  }

  // フォールバック
  const [a, rest] = splitAt(title, Math.ceil(title.length / 3));
  const [b, c]    = splitAt(rest, Math.ceil(rest.length / 2));
  return { lines: [a, b, c].filter(Boolean), fontSize: 36, lineH: 50 };
}

// ─── キーワードタイル分割 ─────────────────────────────────────────
function splitKeyword(kw: string): string[] {
  if (!kw?.trim()) return [];
  const segs = kw.trim().split(/[\s　\/・·、。]+/).filter(Boolean);
  const tiles: string[] = [];
  for (const seg of segs) {
    if (tiles.length >= 5) break;
    if (seg.length <= 2) {
      tiles.push(seg);
    } else if (/^[A-Za-z0-9]+$/.test(seg)) {
      for (let i = 0; i < seg.length && tiles.length < 5; i += 2)
        tiles.push(seg.slice(i, Math.min(i + 2, seg.length)));
    } else {
      for (const ch of [...seg]) {
        if (tiles.length >= 5) break;
        tiles.push(ch);
      }
    }
  }
  return tiles.slice(0, 5);
}

// タイルの色: ベース色を少しずつ明るくしてグラデーション風に
function tileColor(base: string, idx: number, total: number): string {
  const n = parseInt(base.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8)  & 0xff;
  const b =  n        & 0xff;
  const step = total > 1 ? idx / (total - 1) : 0;
  const lighten = Math.round(step * 50);
  const clamp = (v: number) => Math.min(255, v + lighten);
  return `#${clamp(r).toString(16).padStart(2,"0")}${clamp(g).toString(16).padStart(2,"0")}${clamp(b).toString(16).padStart(2,"0")}`;
}

// ─── SVG エスケープ ────────────────────────────────────────────────
function esc(s: string): string {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ─── メイン: SVG生成 ──────────────────────────────────────────────
export function generateEyecatchSvg(
  title: string,
  template: string | null | undefined,
  options: { keyword?: string; subtitle?: string; description?: string } = {}
): string {
  const theme: Theme = (template ? THEMES[template] : undefined) ?? DEFAULT_THEME;
  const subtitle    = options.subtitle    ?? theme.tag;
  const description = options.description ?? "";
  const kwTiles     = splitKeyword(options.keyword ?? "");
  const layout      = layoutTitle(title);

  // ─ タイトル縦位置の計算 ────────────────────────────────────────
  const titleBlockH = layout.lines.length * layout.lineH;
  // descriptionがあれば説明分も含めた全体を vertically center
  const descH       = description ? 40 : 0;
  const totalH      = titleBlockH + descH + (description ? 24 : 0);
  const titleTop    = 315 - totalH / 2;  // 315 = 630/2

  // ─ タイトルテキスト SVG ────────────────────────────────────────
  const fontFamily = "'Noto Sans JP',sans-serif";
  const titleSvg = layout.lines.map((line, i) => {
    const y = Math.round(titleTop + i * layout.lineH + layout.fontSize * 0.82);
    return `<text x="600" y="${y}" font-family="${fontFamily}" font-size="${layout.fontSize}" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="2">${esc(line)}</text>`;
  }).join("\n  ");

  // ─ 説明テキスト ───────────────────────────────────────────────
  const descY = Math.round(titleTop + titleBlockH + 32 + 24 * 0.82);
  const descSvg = description
    ? `<text x="600" y="${descY}" font-family="${fontFamily}" font-size="24" fill="${theme.accent}" opacity="0.90" text-anchor="middle" letter-spacing="1">${esc(description.slice(0, 50))}</text>`
    : "";

  // ─ 吹き出し ──────────────────────────────────────────────────
  const bText    = subtitle.slice(0, 14);
  const bFontSz  = bText.length > 10 ? 19 : 22;
  const bWidth   = Math.round(bText.length * bFontSz * (bFontSz === 22 ? 1.05 : 1.02) + 36);
  const bx = 52, by = 46, bh = 58;
  const bubbleSvg = `
  <!-- 吹き出し -->
  <rect x="${bx}" y="${by}" width="${bWidth}" height="${bh}" rx="${bh/2}" fill="white" opacity="0.94"/>
  <polygon points="${bx+24},${by+bh} ${bx+10},${by+bh+22} ${bx+54},${by+bh}" fill="white" opacity="0.94"/>
  <text x="${bx + bWidth/2}" y="${by + bh/2 + bFontSz*0.38}" font-family="${fontFamily}" font-size="${bFontSz}" font-weight="800" fill="${theme.bubble}" text-anchor="middle">${esc(bText)}</text>`;

  // ─ キーワードタイル ────────────────────────────────────────────
  const TW = 72, TH = 72, TGAP = 10;
  const tilesSvg = kwTiles.length === 0 ? "" : kwTiles.map((seg, i) => {
    const total = kwTiles.length;
    const totalW = total * TW + (total - 1) * TGAP;
    const tx = 1148 - totalW + i * (TW + TGAP);
    const ty = 46;
    const tfs = seg.length === 1 ? 36 : seg.length === 2 ? 28 : 22;
    const color = tileColor(theme.tileBase, i, total);
    return `
  <rect x="${tx}" y="${ty}" width="${TW}" height="${TH}" rx="10" fill="${color}" opacity="0.92"/>
  <text x="${tx + TW/2}" y="${ty + TH/2 + tfs*0.38}" font-family="${fontFamily}" font-size="${tfs}" font-weight="700" fill="white" text-anchor="middle">${esc(seg)}</text>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <!-- 3段グラデーション -->
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="${theme.gradA}"/>
      <stop offset="48%"  stop-color="${theme.gradB}"/>
      <stop offset="100%" stop-color="${theme.gradC}"/>
    </linearGradient>
    <!-- 放射状ソフトグロー -->
    <radialGradient id="glow" cx="38%" cy="42%" r="55%">
      <stop offset="0%"   stop-color="white" stop-opacity="0.09"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>
    <!-- ドットパターン(テクスチャ) -->
    <pattern id="dots" x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
      <circle cx="18" cy="18" r="1.2" fill="white" opacity="0.07"/>
    </pattern>
  </defs>

  <!-- 背景 -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#dots)"/>
  <ellipse cx="420" cy="280" rx="520" ry="280" fill="url(#glow)"/>

  <!-- 装飾: 大円 -->
  <circle cx="1080" cy="80"  r="220" fill="white" opacity="0.04"/>
  <circle cx="130"  cy="560" r="170" fill="white" opacity="0.04"/>
  <circle cx="600"  cy="315" r="340" fill="white" opacity="0.025"/>

  <!-- 二重枠 (白) -->
  <rect x="18" y="18" width="1164" height="594" rx="22" fill="none" stroke="white" stroke-width="2.5" opacity="0.75"/>
  <rect x="28" y="28" width="1144" height="574" rx="16" fill="none" stroke="white" stroke-width="1"   opacity="0.38"/>

  ${bubbleSvg}
  ${tilesSvg}

  <!-- タイトル(シャドウ) -->
  ${layout.lines.map((line, i) => {
    const y = Math.round(titleTop + i * layout.lineH + layout.fontSize * 0.82);
    return `<text x="602" y="${y+2}" font-family="${fontFamily}" font-size="${layout.fontSize}" font-weight="700" fill="black" text-anchor="middle" opacity="0.25" letter-spacing="2">${esc(line)}</text>`;
  }).join("\n  ")}

  <!-- タイトル本体 -->
  ${titleSvg}

  <!-- 説明文 -->
  ${descSvg}

  <!-- サイトラベル -->
  <text x="600" y="606" font-family="monospace" font-size="18" fill="white" opacity="0.45" text-anchor="middle" letter-spacing="2">kawacoins.com</text>
</svg>`;
}

// ─── フォントを base64 埋め込みデータから Buffer として resvg に渡す ──
// font-data.ts は webpack バンドルに確実に含まれる JS モジュール。
// fontBuffers でメモリから直接渡すので、ファイルシステム依存ゼロ
// (/tmp 書き込みやパス解決が不要 → Vercel でも確実に動く)
import { FONT_JP_BASE64, FONT_LAT_BASE64 } from "@/lib/fonts/font-data";

let fontBuffersReady: Buffer[] | null = null;

function getFontBuffers(): Buffer[] {
  if (fontBuffersReady) return fontBuffersReady;
  fontBuffersReady = [
    Buffer.from(FONT_JP_BASE64, "base64"),
    Buffer.from(FONT_LAT_BASE64, "base64"),
  ];
  return fontBuffersReady;
}

// ─── PNG変換 (resvg-js で日本語フォントを明示指定) ──────────────────
export async function generateEyecatchPng(
  title: string,
  template: string | null | undefined,
  options: { keyword?: string; subtitle?: string; description?: string } = {}
): Promise<Buffer> {
  const svg = generateEyecatchSvg(title, template, options);
  const { Resvg } = await import("@resvg/resvg-js");
  // fontBuffers は実行時はサポートされているが 2.6.2 の型定義に無いため cast
  const font = {
    fontBuffers: getFontBuffers(),
    loadSystemFonts: false,
    sansSerifFamily: "Noto Sans JP",
    defaultFontFamily: "Noto Sans JP",
  } as unknown as ConstructorParameters<typeof Resvg>[1] extends { font?: infer F } ? F : never;
  const resvg = new Resvg(svg, { font });
  return Buffer.from(resvg.render().asPng());
}
