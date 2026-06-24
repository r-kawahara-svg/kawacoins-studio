/**
 * アイキャッチ画像生成 (SVG → PNG)
 * OGP標準サイズ 1200×630px
 */

type TemplateColor = { bg: string; accent: string; tag: string };
const TEMPLATE_COLORS: Record<string, TemplateColor> = {
  T1: { bg: "#0f766b", accent: "#ccfbf1", tag: "体験レビュー" },
  T2: { bg: "#1d4ed8", accent: "#dbeafe", tag: "比較ランキング" },
  T3: { bg: "#065f46", accent: "#d1fae5", tag: "始め方解説" },
  T4: { bg: "#3730a3", accent: "#e0e7ff", tag: "決算分析" },
  T5: { bg: "#991b1b", accent: "#fee2e2", tag: "失敗談・教訓" },
};
const DEFAULT_COLOR = { bg: "#1e293b", accent: "#f1f5f9", tag: "投資コラム" };

function splitTitle(title: string): string[] {
  if (title.length <= 22) return [title];
  // split roughly in half at a natural break
  const mid = Math.floor(title.length / 2);
  // find nearest space or punctuation near mid
  for (let i = mid; i < title.length; i++) {
    if ("　・／・、。…".includes(title[i]) || title[i] === " ") {
      return [title.slice(0, i + 1), title.slice(i + 1)];
    }
  }
  return [title.slice(0, mid), title.slice(mid)];
}

export function generateEyecatchSvg(
  title: string,
  template: string | null | undefined,
  subtitle?: string
): string {
  const colors: TemplateColor = (template ? TEMPLATE_COLORS[template] : undefined) ?? DEFAULT_COLOR;
  const lines = splitTitle(title);
  const fontSize = lines[0].length > 18 ? 52 : 60;
  const lineH = fontSize * 1.4;
  const totalH = lines.length * lineH;
  const startY = 315 - totalH / 2 + fontSize * 0.85;

  const textLines = lines
    .map(
      (line, i) =>
        `<text x="600" y="${startY + i * lineH}" font-family="'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="auto">${escSvg(line)}</text>`
    )
    .join("\n    ");

  const subText = subtitle
    ? `<text x="600" y="${startY + lines.length * lineH + 20}" font-family="sans-serif" font-size="24" fill="${colors.accent}" opacity="0.85" text-anchor="middle">${escSvg(subtitle)}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${darken(colors.bg)};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <!-- decorative circles -->
  <circle cx="1050" cy="100" r="200" fill="${colors.accent}" opacity="0.08" />
  <circle cx="150" cy="530" r="160" fill="${colors.accent}" opacity="0.06" />
  <!-- left accent bar -->
  <rect x="60" y="200" width="6" height="230" rx="3" fill="${colors.accent}" opacity="0.7" />
  <!-- tag -->
  <rect x="76" y="180" width="${colors.tag.length * 18 + 24}" height="36" rx="18" fill="${colors.accent}" opacity="0.18" />
  <text x="88" y="204" font-family="sans-serif" font-size="20" font-weight="600" fill="${colors.accent}">${escSvg(colors.tag)}</text>
  <!-- title -->
  ${textLines}
  ${subText}
  <!-- site label -->
  <text x="600" y="590" font-family="monospace" font-size="20" fill="${colors.accent}" opacity="0.5" text-anchor="middle">kawacoins.com</text>
</svg>`;
}

function darken(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - 40);
  const g = Math.max(0, ((n >> 8) & 0xff) - 40);
  const b = Math.max(0, (n & 0xff) - 40);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function escSvg(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function generateEyecatchPng(
  title: string,
  template: string | null | undefined,
  subtitle?: string
): Promise<Buffer> {
  const svg = generateEyecatchSvg(title, template, subtitle);
  const sharp = (await import("sharp")).default;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
