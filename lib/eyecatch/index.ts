/**
 * アイキャッチ画像生成 (SVG → PNG)
 * OGP標準サイズ 1200×630px
 * デザイン: テーマカラーグラデーション + 白二重枠 + 吹き出し + キーワードタイル
 *
 * フォント方式: テキストは opentype.js で事前にベクターパス(<path>)へ変換し
 * SVG に焼き込む。レンダラ(sharp)側のフォント解決に一切依存しないため、
 * 日本語システムフォントの無い Vercel/Linux でも確実に文字が描画される。
 */
import * as opentype from "opentype.js";
import { FONT_JP_WOFF_BASE64, FONT_LAT_WOFF_BASE64 } from "@/lib/fonts/font-data";

// ─── フォントを base64(woff1) から一度だけパース ──────────────────
let fontsCache: { jp: opentype.Font; lat: opentype.Font } | null = null;
function getFonts() {
  if (fontsCache) return fontsCache;
  const toAB = (b64: string) => {
    const buf = Buffer.from(b64, "base64");
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  };
  fontsCache = {
    jp: opentype.parse(toAB(FONT_JP_WOFF_BASE64)),
    lat: opentype.parse(toAB(FONT_LAT_WOFF_BASE64)),
  };
  return fontsCache;
}

// グリフを大きい固定サイズ(REF)でパス化し transform scale で縮小する。
// resvg は ~36px 以下の抜き文字(o,a 等)の穴を誤って塗りつぶすバグがあるため、
// 座標を大きいまま保ってベクター縮小することで小サイズでも崩れさせない。
const REF = 100;

// テキストをグリフごとにパス化。グリフを持つフォント(日本語→ラテン)を自動選択。
// xLeft 基準・yBaseline ベースラインで配置し、{ svg, width } を返す。
function buildTextPath(
  text: string, xLeft: number, yBaseline: number, fontSize: number,
  fill: string, opacity?: number
): { svg: string; width: number } {
  const { jp, lat } = getFonts();
  const s = fontSize / REF;
  let penRef = 0;
  const parts: string[] = [];
  for (const ch of [...text]) {
    const inJp = jp.charToGlyph(ch).index;
    const inLat = lat.charToGlyph(ch).index;
    // どちらのフォントにも無い文字(.notdef=豆腐□)は描画も加算もせずスキップ
    if (!inJp && !inLat) continue;
    const f = inJp ? jp : lat;
    const glyph = f.charToGlyph(ch);
    // 各グリフは原点(x=0)で描き、translate で配置する。
    // getPath に大きな x を渡すとパス座標が巨大になり、resvg が特定グリフの
    // 密な数値列を誤読して欠落させるバグがあるため、原点描画で回避する。
    const d = glyph.getPath(0, 0, REF).toPathData(2);
    if (d) parts.push(`<g transform="translate(${penRef.toFixed(2)},0)"><path d="${d}"/></g>`);
    penRef += (glyph.advanceWidth ?? f.unitsPerEm) * (REF / f.unitsPerEm);
  }
  const op = opacity != null ? ` opacity="${opacity}"` : "";
  const svg = `<g transform="translate(${xLeft},${yBaseline}) scale(${s.toFixed(4)})" fill="${fill}"${op}>${parts.join("")}</g>`;
  return { svg, width: penRef * s };
}

// 中央揃えテキスト(text-anchor="middle"相当)を <g translate> で配置
function centeredText(
  text: string, cx: number, yBaseline: number, fontSize: number,
  fill: string, opacity?: number
): string {
  const { svg, width } = buildTextPath(text, 0, yBaseline, fontSize, fill, opacity);
  const dx = Math.round(cx - width / 2);
  return `<g transform="translate(${dx},0)">${svg}</g>`;
}

// テキストの描画幅だけを測る（タイル幅の自動調整用）
function measureTextWidth(text: string, fontSize: number): number {
  const { jp, lat } = getFonts();
  let penRef = 0;
  for (const ch of [...text]) {
    const inJp = jp.charToGlyph(ch).index;
    const inLat = lat.charToGlyph(ch).index;
    if (!inJp && !inLat) continue;
    const f = inJp ? jp : lat;
    const glyph = f.charToGlyph(ch);
    penRef += (glyph.advanceWidth ?? f.unitsPerEm) * (REF / f.unitsPerEm);
  }
  return penRef * (fontSize / REF);
}

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

// ─── Unsplash 背景写真 ────────────────────────────────────────────
// テンプレ種別ごとの検索キーワード（記事内容と合う写真を狙う）
const UNSPLASH_KEYWORDS: Record<string, string> = {
  T1: "investing personal finance",
  T2: "finance comparison analysis",
  T3: "investment guide success",
  T4: "stock market chart trading",
  T5: "financial risk warning money",
  T6: "financial system documents",
};
const DEFAULT_UNSPLASH_KEYWORD = "finance money investment";

// Unsplash からランダム写真を取得し base64 data URI で返す。
// UNSPLASH_ACCESS_KEY 未設定・失敗時は null（グラデーション背景にフォールバック）。
export async function fetchUnsplashPhoto(keyword: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&orientation=landscape&content_filter=high`;
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { urls?: { regular?: string } };
    const photoUrl = data?.urls?.regular;
    if (!photoUrl) return null;

    const imgRes = await fetch(photoUrl, { signal: AbortSignal.timeout(10000) });
    if (!imgRes.ok) return null;
    const buf = await imgRes.arrayBuffer();
    const mime = imgRes.headers.get("content-type") ?? "image/jpeg";
    return `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

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
// キーワードを「意味のある単語」単位のタイルにする。
// 1文字ずつに刻まない。長い語は丸ごと1タイル（幅は描画側で自動調整）。
function splitKeyword(kw: string): string[] {
  if (!kw?.trim()) return [];
  // 区切り文字（空白・中黒・スラッシュ・読点・vs など）で単語に分割
  const segs = kw
    .trim()
    .split(/[\s　\/・·、。,]+|vs\.?|VS|×/i)
    .map(s => s.trim())
    .filter(Boolean);

  const tiles: string[] = [];
  for (const seg of segs) {
    if (tiles.length >= 4) break;        // タイルは最大4語まで
    if ([...seg].length > 8) continue;   // 長すぎる語はタイルに不向きなので除外
    tiles.push(seg);
  }
  return tiles;
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

// ─── メイン: SVG生成 ──────────────────────────────────────────────
export function generateEyecatchSvg(
  title: string,
  template: string | null | undefined,
  options: { keyword?: string; subtitle?: string; description?: string; photoBg?: string | null } = {}
): string {
  const theme: Theme = (template ? THEMES[template] : undefined) ?? DEFAULT_THEME;
  const subtitle    = options.subtitle    ?? theme.tag;
  const description = options.description ?? "";
  const photoBg     = options.photoBg ?? null;
  const kwTiles     = splitKeyword(options.keyword ?? "");
  const layout      = layoutTitle(title);

  // ─ タイトル縦位置の計算 ────────────────────────────────────────
  const titleBlockH = layout.lines.length * layout.lineH;
  // descriptionがあれば説明分も含めた全体を vertically center
  const descH       = description ? 40 : 0;
  const totalH      = titleBlockH + descH + (description ? 24 : 0);
  const titleTop    = 315 - totalH / 2;  // 315 = 630/2

  // ─ タイトルテキスト (パス化) ───────────────────────────────────
  const titleSvg = layout.lines.map((line, i) => {
    const y = Math.round(titleTop + i * layout.lineH + layout.fontSize * 0.82);
    return centeredText(line, 600, y, layout.fontSize, "#ffffff");
  }).join("\n  ");

  // ─ 説明テキスト (パス化) ───────────────────────────────────────
  const descY = Math.round(titleTop + titleBlockH + 32 + 24 * 0.82);
  const descSvg = description
    ? centeredText(description.slice(0, 50), 600, descY, 24, theme.accent, 0.9)
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
  ${centeredText(bText, bx + bWidth/2, by + bh/2 + bFontSz*0.38, bFontSz, theme.bubble)}`;

  // ─ キーワードタイル（語ごとに幅を自動調整・右上に配置）──────────
  const TFS = 26, TH = 50, TGAP = 10, TPADX = 16, TY = 46;
  const RIGHT_EDGE = 1148;           // タイル右端
  const TILE_BUDGET = 660;           // 右側に使える最大幅（吹き出しと重ねない）
  // 各語の幅を測り、予算に収まる語だけ採用（意味が壊れる切り詰めはしない）
  const fitted: { seg: string; w: number }[] = [];
  let used = 0;
  for (const seg of kwTiles) {
    const tw = Math.round(measureTextWidth(seg, TFS)) + TPADX * 2;
    const add = tw + (fitted.length > 0 ? TGAP : 0);
    if (used + add > TILE_BUDGET) break;
    fitted.push({ seg, w: tw });
    used += add;
  }
  const totalW = fitted.reduce((s, t) => s + t.w, 0) + TGAP * Math.max(0, fitted.length - 1);
  let tx = RIGHT_EDGE - totalW;
  const tilesSvg = fitted.map((t, i) => {
    const color = tileColor(theme.tileBase, i, fitted.length);
    const rect = `
  <rect x="${tx}" y="${TY}" width="${t.w}" height="${TH}" rx="10" fill="${color}" opacity="0.94"/>
  ${centeredText(t.seg, tx + t.w / 2, TY + TH / 2 + TFS * 0.36, TFS, "white")}`;
    tx += t.w + TGAP;
    return rect;
  }).join("");

  // ─ 背景レイヤー: 写真があれば写真+スクリム、なければグラデーション ─
  const bgLayer = photoBg ? `
  <defs>
    <!-- 写真を暗く覆って文字を読みやすくするスクリム -->
    <linearGradient id="scrim" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="${theme.gradC}" stop-opacity="0.80"/>
      <stop offset="50%"  stop-color="${theme.gradC}" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="${theme.gradC}" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <image href="${photoBg}" x="0" y="0" width="1200" height="630" preserveAspectRatio="xMidYMid slice"/>
  <rect width="1200" height="630" fill="url(#scrim)"/>` : `
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="${theme.gradA}"/>
      <stop offset="48%"  stop-color="${theme.gradB}"/>
      <stop offset="100%" stop-color="${theme.gradC}"/>
    </linearGradient>
    <radialGradient id="glow" cx="38%" cy="42%" r="55%">
      <stop offset="0%"   stop-color="white" stop-opacity="0.09"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
      <circle cx="18" cy="18" r="1.2" fill="white" opacity="0.07"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#dots)"/>
  <ellipse cx="420" cy="280" rx="520" ry="280" fill="url(#glow)"/>
  <circle cx="1080" cy="80"  r="220" fill="white" opacity="0.04"/>
  <circle cx="130"  cy="560" r="170" fill="white" opacity="0.04"/>
  <circle cx="600"  cy="315" r="340" fill="white" opacity="0.025"/>`;

  // ─ タイトル背景パネル (写真時のみ・可読性確保) ──────────────────
  const panelPadY = 26;
  const titlePanelSvg = photoBg ? `
  <rect x="48" y="${Math.round(titleTop - panelPadY)}" width="1104" height="${Math.round(titleBlockH + panelPadY * 2)}" rx="14" fill="black" opacity="0.34"/>` : "";

  // ─ Unsplash クレジット (写真時のみ) ───────────────────────────
  const creditSvg = photoBg
    ? `<text x="1188" y="623" font-family="sans-serif" font-size="11" fill="white" opacity="0.5" text-anchor="end">Photo: Unsplash</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  ${bgLayer}

  <!-- 二重枠 (白) -->
  <rect x="18" y="18" width="1164" height="594" rx="22" fill="none" stroke="white" stroke-width="2.5" opacity="0.75"/>
  <rect x="28" y="28" width="1144" height="574" rx="16" fill="none" stroke="white" stroke-width="1"   opacity="0.38"/>

  ${bubbleSvg}
  ${tilesSvg}
  ${titlePanelSvg}

  <!-- タイトル(シャドウ) -->
  ${layout.lines.map((line, i) => {
    const y = Math.round(titleTop + i * layout.lineH + layout.fontSize * 0.82);
    return centeredText(line, 602, y + 2, layout.fontSize, "black", photoBg ? 0.55 : 0.25);
  }).join("\n  ")}

  <!-- タイトル本体 -->
  ${titleSvg}

  <!-- 説明文 -->
  ${descSvg}

  <!-- サイトラベル -->
  ${centeredText("kawacoins.com", 600, 606, 18, "white", 0.5)}
  ${creditSvg}
</svg>`;
}

// ─── PNG変換 (resvg) ──────────────────────────────────────────────
// SVG 内のテキストは opentype.js で <path> に焼き込み済み。よってレンダラ側の
// フォント解決は一切不要 = Linux でフォントが読めない問題はそもそも発生しない。
// resvg はパス描画が正確(小さいグリフの抜き文字も崩れない)なのでこちらを使う。
export async function generateEyecatchPng(
  title: string,
  template: string | null | undefined,
  options: { keyword?: string; subtitle?: string; description?: string; photoQuery?: string } = {}
): Promise<Buffer> {
  // 背景写真を取得。記事内容に合う photoQuery を最優先、無ければテンプレ既定。
  const unsplashKeyword = options.photoQuery?.trim()
    || (template ? UNSPLASH_KEYWORDS[template] : null)
    || DEFAULT_UNSPLASH_KEYWORD;
  const photoBg = await fetchUnsplashPhoto(unsplashKeyword);

  const svg = generateEyecatchSvg(title, template, { ...options, photoBg });
  const { Resvg } = await import("@resvg/resvg-js");
  return Buffer.from(new Resvg(svg).render().asPng());
}
