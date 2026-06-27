/**
 * アイキャッチ画像生成 (SVG → PNG)
 * OGP標準サイズ 1200×630px
 * 背景: Unsplash写真 (UNSPLASH_ACCESS_KEY があれば) / なければグラデーション
 */

type Theme = {
  gradA: string;
  gradB: string;
  gradC: string;
  accent: string;
  tileBase: string;
  bubble: string;
  tag: string;
  overlayA: string; // 写真オーバーレイ上端色
  overlayB: string; // 写真オーバーレイ下端色
};

const THEMES: Record<string, Theme> = {
  T6: {
    gradA: "#2b5c8c", gradB: "#1e4570", gradC: "#102b4f",
    accent: "#90c8f0", tileBase: "#2d71b8", bubble: "#102b4f",
    tag: "制度をわかりやすく",
    overlayA: "#0d2a50e6", overlayB: "#1a3a6ecc",
  },
  T1: {
    gradA: "#1c8070", gradB: "#0f6b5a", gradC: "#083f35",
    accent: "#7ee8d4", tileBase: "#1a9a82", bubble: "#083f35",
    tag: "実体験レポート！",
    overlayA: "#062820e6", overlayB: "#0f6b5acc",
  },
  T2: {
    gradA: "#1f5099", gradB: "#163a78", gradC: "#0b2455",
    accent: "#7eb5f0", tileBase: "#2264cc", bubble: "#0b2455",
    tag: "徹底比較まとめ",
    overlayA: "#0b1e40e6", overlayB: "#163a78cc",
  },
  T3: {
    gradA: "#207840", gradB: "#155f30", gradC: "#0a4020",
    accent: "#70cc88", tileBase: "#24954c", bubble: "#0a4020",
    tag: "完全攻略ガイド",
    overlayA: "#062010e6", overlayB: "#155f30cc",
  },
  T4: {
    gradA: "#363e7e", gradB: "#272d65", gradC: "#181d4c",
    accent: "#9aa8e0", tileBase: "#3d4fb8", bubble: "#181d4c",
    tag: "決算速報分析！",
    overlayA: "#10143ae6", overlayB: "#272d65cc",
  },
  T5: {
    gradA: "#882424", gradB: "#6a1818", gradC: "#4c0f0f",
    accent: "#f0a0a0", tileBase: "#b83030", bubble: "#4c0f0f",
    tag: "失敗から学ぶ",
    overlayA: "#2a0808e6", overlayB: "#6a1818cc",
  },
};

const DEFAULT_THEME: Theme = {
  gradA: "#223348", gradB: "#182636", gradC: "#0e1a24",
  accent: "#8ab4cc", tileBase: "#2c5070", bubble: "#0e1a24",
  tag: "kawacoin的まとめ",
  overlayA: "#0e1a24e6", overlayB: "#182636cc",
};

// Unsplash検索キーワード（英語の方がヒット精度が高い）
const UNSPLASH_KEYWORDS: Record<string, string> = {
  T1: "investing personal finance",
  T2: "finance comparison analysis",
  T3: "investment guide success",
  T4: "stock market chart trading",
  T5: "financial risk warning money",
  T6: "financial system documents",
};
const DEFAULT_UNSPLASH_KEYWORD = "finance money investment";

// ─── 文字幅推定 ───────────────────────────────────────────────────
function estimateWidth(text: string, fontSize: number): number {
  let w = 0;
  for (const ch of [...text]) {
    const code = ch.codePointAt(0) ?? 0;
    w += code > 0x7e ? fontSize : fontSize * 0.62;
  }
  return w;
}

// ─── タイトル行分割 ───────────────────────────────────────────────
interface TitleLayout { lines: string[]; fontSize: number; lineH: number; }

const BREAK_CHARS = new Set([...Array.from("　・／、。…— ")]);

function splitAt(str: string, idealPos: number): [string, string] {
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
  const MAX_W = 1060;
  for (const fs of [80, 72, 64, 56, 50]) {
    if (estimateWidth(title, fs) <= MAX_W) {
      return { lines: [title], fontSize: fs, lineH: Math.round(fs * 1.45) };
    }
  }
  for (const fs of [70, 62, 56, 50, 44]) {
    const [a, b] = splitAt(title, Math.ceil(title.length / 2));
    if (estimateWidth(a, fs) <= MAX_W && estimateWidth(b, fs) <= MAX_W) {
      return { lines: [a, b].filter(Boolean), fontSize: fs, lineH: Math.round(fs * 1.45) };
    }
  }
  const [a, rest] = splitAt(title, Math.ceil(title.length / 3));
  const [b, c]    = splitAt(rest, Math.ceil(rest.length / 2));
  return { lines: [a, b, c].filter(Boolean), fontSize: 36, lineH: 52 };
}

// ─── SVGエスケープ ────────────────────────────────────────────────
function esc(s: string): string {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ─── Unsplash から写真を取得して base64 に変換 ────────────────────
async function fetchUnsplashPhoto(keyword: string): Promise<string | null> {
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

    // 写真本体をダウンロード
    const imgRes = await fetch(photoUrl, { signal: AbortSignal.timeout(10000) });
    if (!imgRes.ok) return null;
    const buf = await imgRes.arrayBuffer();
    const mime = imgRes.headers.get("content-type") ?? "image/jpeg";
    return `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

// ─── メイン: SVG生成 ──────────────────────────────────────────────
export function generateEyecatchSvg(
  title: string,
  template: string | null | undefined,
  options: {
    keyword?: string;
    subtitle?: string;
    photoBg?: string | null;   // base64 data URI
    illustration?: string;
  } = {}
): string {
  const theme     = (template ? THEMES[template] : undefined) ?? DEFAULT_THEME;
  const subtitle  = options.subtitle ?? theme.tag;
  const photoBg   = options.photoBg ?? null;
  const illustration = options.illustration ?? "";
  const layout    = layoutTitle(title);
  const fontFamily = "'Noto Sans JP',sans-serif";

  // タイトル縦位置
  const titleBlockH = layout.lines.length * layout.lineH;
  const titleTop    = 315 - titleBlockH / 2;

  // ─ 背景レイヤー ──────────────────────────────────────────────
  const bgLayer = photoBg ? `
  <!-- 写真背景 -->
  <image href="${photoBg}" x="0" y="0" width="1200" height="630" preserveAspectRatio="xMidYMid slice"/>
  <!-- 写真を引き締めるオーバーレイ: 上から下へ暗く -->
  <defs>
    <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="${theme.overlayA}"/>
      <stop offset="100%" stop-color="${theme.overlayB}"/>
    </linearGradient>
    <linearGradient id="overlayH" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#000000" stop-opacity="0.55"/>
      <stop offset="60%"  stop-color="#000000" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.45"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#overlay)" opacity="0.82"/>
  <rect width="1200" height="630" fill="url(#overlayH)"/>
` : `
  <!-- グラデーション背景（写真なし時フォールバック） -->
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
`;

  // ─ タグバッジ（左上・角丸） ──────────────────────────────────
  const bText   = subtitle.slice(0, 14);
  const bFontSz = bText.length > 10 ? 19 : 22;
  const bWidth  = Math.round(bText.length * bFontSz * (bFontSz === 22 ? 1.05 : 1.02) + 40);
  const bx = 48, by = 44, bh = 52;
  const tagSvg = `
  <rect x="${bx}" y="${by}" width="${bWidth}" height="${bh}" rx="${bh / 2}" fill="${theme.accent}"/>
  <polygon points="${bx+28},${by+bh} ${bx+14},${by+bh+20} ${bx+56},${by+bh}" fill="${theme.accent}"/>
  <text x="${bx + bWidth / 2}" y="${by + bh / 2 + bFontSz * 0.38}" font-family="${fontFamily}" font-size="${bFontSz}" font-weight="800" fill="${theme.bubble}" text-anchor="middle">${esc(bText)}</text>`;

  // ─ タイトル背景パネル（視認性確保） ─────────────────────────
  const panelPadX = 56, panelPadY = 28;
  const panelY = titleTop - panelPadY;
  const panelH = titleBlockH + panelPadY * 2;
  const titlePanelSvg = `
  <rect x="${panelPadX - 8}" y="${panelY}" width="${1200 - (panelPadX - 8) * 2}" height="${panelH}" rx="12" fill="black" opacity="0.38"/>`;

  // ─ タイトルテキスト ───────────────────────────────────────────
  const shadowSvg = layout.lines.map((line, i) => {
    const y = Math.round(titleTop + i * layout.lineH + layout.fontSize * 0.82);
    return `<text x="602" y="${y + 3}" font-family="${fontFamily}" font-size="${layout.fontSize}" font-weight="900" fill="black" text-anchor="middle" opacity="0.55" letter-spacing="1">${esc(line)}</text>`;
  }).join("\n  ");

  const titleSvg = layout.lines.map((line, i) => {
    const y = Math.round(titleTop + i * layout.lineH + layout.fontSize * 0.82);
    return `<text x="600" y="${y}" font-family="${fontFamily}" font-size="${layout.fontSize}" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">${esc(line)}</text>`;
  }).join("\n  ");

  // ─ サイトラベル（左下） ──────────────────────────────────────
  const siteSvg = `
  <rect x="44" y="574" width="210" height="34" rx="8" fill="${theme.accent}" opacity="0.20"/>
  <text x="149" y="596" font-family="monospace" font-size="17" fill="${theme.accent}" opacity="0.90" text-anchor="middle" letter-spacing="2">kawacoins.com</text>`;

  // ─ Unsplashクレジット（右下・必須表記） ──────────────────────
  const creditSvg = photoBg ? `
  <text x="1190" y="624" font-family="sans-serif" font-size="11" fill="white" opacity="0.45" text-anchor="end">Photo: Unsplash</text>` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1200 630" width="1200" height="630">
  ${bgLayer}

  <!-- AIイラスト（写真なし時のみ有効活用） -->
  ${photoBg ? "" : illustration}

  <!-- 装飾: 大円（写真なし時） -->
  ${photoBg ? "" : `
  <circle cx="1080" cy="80"  r="220" fill="white" opacity="0.04"/>
  <circle cx="130"  cy="560" r="170" fill="white" opacity="0.04"/>
  `}

  <!-- 外枠 -->
  <rect x="14" y="14" width="1172" height="602" rx="20" fill="none" stroke="${theme.accent}" stroke-width="2.5" opacity="0.60"/>
  <rect x="22" y="22" width="1156" height="586" rx="14" fill="none" stroke="white" stroke-width="1" opacity="0.20"/>

  ${tagSvg}
  ${titlePanelSvg}
  ${shadowSvg}
  ${titleSvg}
  ${siteSvg}
  ${creditSvg}
</svg>`;
}

// ─── Claudeによるイラスト生成（写真なし時のフォールバック強化用） ──
const TEMPLATE_LABELS: Record<string, string> = {
  T1: "実体験レポート・体験談",
  T2: "徹底比較・ランキング",
  T3: "完全攻略ガイド・やり方",
  T4: "決算・株価・市場分析",
  T5: "失敗談・注意点・リスク",
  T6: "制度・仕組み・基礎知識",
};

async function generateIllustrationGroup(
  title: string,
  template: string | null | undefined,
  theme: Theme
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return "";
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const category = template ? (TEMPLATE_LABELS[template] ?? template) : "投資・お金";

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      messages: [{
        role: "user",
        content: `ブログ記事アイキャッチ（1200×630px）の右側エリア(x=680〜1150, y=100〜530)に配置する装飾SVGを生成。

記事: "${title}"
カテゴリ: ${category}
カラー: ${theme.accent}（メイン）、white（サブ）

ルール:
- <g>タグのみ返す（説明文不要）
- コイン/グラフ/建物/矢印などを幾何学的に表現
- fill は ${theme.accent} か white のみ、opacity 0.25〜0.65
- <text>要素は含めない
- 要素数10〜20個

<g>のみ返してください:`,
      }],
    });

    const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "";
    import("@/lib/track-usage").then(({ trackUsage }) =>
      trackUsage({
        operation: "eyecatch-illustration",
        model: "claude-haiku-4-5-20251001",
        inputTokens: msg.usage.input_tokens,
        outputTokens: msg.usage.output_tokens,
      }).catch(() => {})
    ).catch(() => {});

    const match = text.match(/<g[\s\S]*?<\/g>/);
    return match ? match[0] : "";
  } catch {
    return "";
  }
}

// ─── フォントを /tmp にキャッシュして resvg に渡す ──────────────────
import { FONT_JP_PATH, FONT_LAT_PATH } from "@/lib/fonts/paths";

let fontFilesReady: string[] | null = null;

async function getFontFiles(): Promise<string[]> {
  if (fontFilesReady) return fontFilesReady;
  const { readFileSync, writeFileSync, existsSync } = await import("fs");
  const sources = [
    { src: FONT_JP_PATH,  tmp: "/tmp/noto-jp-700.woff2" },
    { src: FONT_LAT_PATH, tmp: "/tmp/noto-lat-700.woff2" },
  ];
  const result: string[] = [];
  for (const { src, tmp } of sources) {
    if (!existsSync(tmp)) {
      try { writeFileSync(tmp, readFileSync(src)); } catch { continue; }
    }
    result.push(tmp);
  }
  if (result.length > 0) fontFilesReady = result;
  return result;
}

// ─── PNG変換エントリポイント ──────────────────────────────────────
export async function generateEyecatchPng(
  title: string,
  template: string | null | undefined,
  options: { keyword?: string; subtitle?: string } = {}
): Promise<Buffer> {
  const theme = (template ? THEMES[template] : undefined) ?? DEFAULT_THEME;
  const unsplashKeyword = (template ? UNSPLASH_KEYWORDS[template] : null) ?? DEFAULT_UNSPLASH_KEYWORD;

  // 写真とイラストを並行取得
  const [photoBg, illustration] = await Promise.all([
    fetchUnsplashPhoto(unsplashKeyword),
    // 写真が取れなかった場合のみイラストを活用するが、先に並行して取得
    generateIllustrationGroup(title, template, theme),
  ]);

  const svg = generateEyecatchSvg(title, template, { ...options, photoBg, illustration });

  const { Resvg } = await import("@resvg/resvg-js");
  const fontFiles = await getFontFiles();
  const resvg = new Resvg(svg, {
    font: {
      fontFiles,
      loadSystemFonts: false,
      sansSerifFamily: "Noto Sans JP",
      defaultFontFamily: "Noto Sans JP",
    },
  });
  return Buffer.from(resvg.render().asPng());
}
