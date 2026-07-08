/**
 * アフィリエイト置換ロジック
 * DB から active な affiliate_programs を取得し、
 * [AFFILIATE:テーマ] プレースホルダを適切な広告 HTML に置換する。
 */
import { db } from "@/db";
import { affiliatePrograms } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

interface AffiliateRow {
  id: string;
  name: string;
  htmlSnippet: string;
  themes: string[];
  adType: string | null;
  priority: number | null;
  strength: string | null;
}

/**
 * active な全プログラムを取得してテーマ→広告のマップを返す。
 * text > banner の優先度で、同条件なら作成順（先頭）。
 */
export async function buildAffiliateMap(): Promise<Map<string, AffiliateRow>> {
  const rows = await db
    .select({
      id: affiliatePrograms.id,
      name: affiliatePrograms.name,
      htmlSnippet: affiliatePrograms.htmlSnippet,
      themes: affiliatePrograms.themes,
      adType: affiliatePrograms.adType,
      priority: affiliatePrograms.priority,
      strength: affiliatePrograms.strength,
    })
    .from(affiliatePrograms)
    .where(eq(affiliatePrograms.active, true))
    .orderBy(
      // ① text優先（text=0, banner=1）→ ② priority昇順 → ③ createdAt昇順
      sql`CASE WHEN ${affiliatePrograms.adType} = 'text' THEN 0 ELSE 1 END`,
      affiliatePrograms.priority,
      affiliatePrograms.createdAt
    );

  const map = new Map<string, AffiliateRow>();
  for (const row of rows) {
    const themes = (row.themes as string[]) ?? [];
    for (const theme of themes) {
      if (!map.has(theme)) {
        map.set(theme, row as AffiliateRow);
      }
    }
  }
  return map;
}

// ─── プログラム別 CTA コピー定義 ──────────────────────────────────
interface CtaCopy {
  micro: string;          // ボタン上のマイクロコピー
  label: string;          // ボタン文言（末尾 ▶ 含む）
  gradTop: string;        // グラデーション上端
  gradBot: string;        // グラデーション下端
  shadow: string;         // box-shadow 色（立体感）
  disclaimer?: string;    // ボタン下の免責・補足
}

function getCtaCopy(rowName: string, anchorText: string): CtaCopy {
  const n = rowName.toLowerCase();
  if (n.includes("ideco")) {
    return {
      micro: "＼ 節税しながら老後資金を積み立てる ／",
      label: "松井証券でiDeCoを無料で始める ▶",
      gradTop: "#3b82f6", gradBot: "#1d4ed8", shadow: "#1e3a8a",
      disclaimer: "※60歳まで原則引き出し不可。詳しくは公式サイトで確認を。",
    };
  }
  if (n.includes("fx") || anchorText.includes("FX")) {
    return {
      micro: "＼ 図解128ページ・完全無料で受け取れます ／",
      label: "FX投資マスターガイドを今すぐ受け取る ▶",
      gradTop: "#22c55e", gradBot: "#16a34a", shadow: "#166534",
      disclaimer: "※FXはハイリスク商品です。必ず内容を確認のうえご利用ください。",
    };
  }
  if (n.includes("alterna") || n.includes("三井物産")) {
    return {
      micro: "＼ 預金でも株でもない、安定資産という選択肢 ／",
      label: "ALTERNAの資産運用を詳しく見る ▶",
      gradTop: "#8b5cf6", gradBot: "#6d28d9", shadow: "#4c1d95",
      disclaimer: "※元本割れリスクあり。詳しくは公式サイトでご確認ください。",
    };
  }
  // 松井証券 口座開設（デフォルト）
  return {
    micro: "＼ 無料・最短5分で開設完了 ／",
    label: "松井証券の口座を無料で開設する ▶",
    gradTop: "#f47a2a", gradBot: "#db5010", shadow: "#963408",
    disclaimer: "※投資にはリスクがあります。詳しくは公式サイトでご確認ください。",
  };
}

// ─── スニペット分解 ────────────────────────────────────────────────
interface SnippetParts {
  href: string;
  hasBannerImg: boolean;
  trackingPixels: string;   // 1×1 計測 img タグ（計測タグ保持）
  bannerHtml: string;       // バナー画像がある場合の完全 HTML
}

function parseSnippet(html: string): SnippetParts {
  // 最初の <a href="..."> を抽出
  const linkMatch = html.match(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
  const href = linkMatch?.[1] ?? "";
  const innerHtml = linkMatch?.[2] ?? "";
  const hasBannerImg = /<img/i.test(innerHtml);

  // 計測ピクセル (width="1" height="1") を全取得
  const trackingPixels = [...html.matchAll(/<img [^>]*width="1"[^>]*/gi)]
    .map(m => m[0].replace(/\/?>$/, "") + ">")
    .join("\n");

  return { href, hasBannerImg, trackingPixels, bannerHtml: html };
}

/**
 * [AFFILIATE:テーマ] を html_snippet に置換。
 * - テキストリンク → 稼ぐサイト水準の CTA ブロック（マイクロコピー+ボタン+免責+計測px）
 * - バナー画像 → センタリングラッパー + rel 付与（そのまま）
 * - rel="nofollow sponsored" は必ず保持
 * - A8計測ピクセル (1×1 img) は絶対に壊さない
 */
export function wrapAffiliate(html: string, rowName = "", anchorText = "", strength: string | null = null): string {
  const { href, hasBannerImg, trackingPixels } = parseSnippet(html);

  // ── バナー（画像）の場合 ──────────────────────────────────────
  if (hasBannerImg) {
    const withRel = html.replace(/<a ([^>]*?)>/gi, (_, attrs: string) => {
      const noRel = attrs.replace(/\s*rel="[^"]*"/, "").trim();
      return `<a rel="nofollow sponsored" ${noRel}>`;
    });
    return `<div style="max-width:100%;overflow-x:auto;text-align:center;margin:24px 0">\n${withRel}\n</div>`;
  }

  // ── テキストリンク → 稼ぐサイト水準 CTA ──────────────────────
  if (!href) return "";
  const copy = getCtaCopy(rowName, anchorText);

  const btnStyle = [
    "display:block",
    `background:linear-gradient(180deg,${copy.gradTop} 0%,${copy.gradBot} 100%)`,
    "color:#fff",
    "font-size:16px",
    "font-weight:700",
    "padding:18px 16px",
    "border-radius:10px",
    "text-decoration:none",
    "letter-spacing:0.3px",
    `box-shadow:0 4px 0 ${copy.shadow},0 6px 16px rgba(0,0,0,.18)`,
    "line-height:1.4",
    "-webkit-tap-highlight-color:transparent",
  ].join(";");

  // サービス固有の強み(USP)があればボタン上にベネフィット行を表示
  const strengthHtml = strength?.trim()
    ? `<p style="font-size:13px;color:#15803d;font-weight:700;margin:0 0 10px;line-height:1.5">✓ ${strength.trim()}</p>`
    : "";

  return `<div style="max-width:480px;margin:36px auto;text-align:center;padding:0 16px;box-sizing:border-box">
<p style="font-size:12px;color:#888;margin:0 0 10px;letter-spacing:0.5px">${copy.micro}</p>
${strengthHtml}<a href="${href}" rel="nofollow sponsored" style="${btnStyle}">${copy.label}</a>
${copy.disclaimer ? `<p style="font-size:11px;color:#bbb;margin:10px 0 0">${copy.disclaimer}</p>` : ""}
${trackingPixels}
</div>`;
}

/**
 * Markdown 本文中の [AFFILIATE:テーマ] を置換して返す。
 * DB アクセスを伴うため async。
 */
export async function replaceAffiliatePlaceholders(bodyMd: string): Promise<string> {
  const map = await buildAffiliateMap();
  // プログラムID指定 [AFFILIATE:id:<uuid>] 用に、有効な全プログラムの id→row マップ
  const allRows = await db.select({
    id: affiliatePrograms.id, name: affiliatePrograms.name, htmlSnippet: affiliatePrograms.htmlSnippet,
    themes: affiliatePrograms.themes, adType: affiliatePrograms.adType, priority: affiliatePrograms.priority,
    strength: affiliatePrograms.strength,
  }).from(affiliatePrograms).where(eq(affiliatePrograms.active, true));
  const byId = new Map<string, AffiliateRow>();
  for (const row of allRows) byId.set(row.id, { ...row, themes: (row.themes as string[]) ?? [] });

  // 同一広告の重複描画を防ぐ（同じプログラムは記事内で1回だけ表示）
  const usedPrograms = new Set<string>();

  return bodyMd.replace(/\[AFFILIATE:([^\]]+)\]/g, (_, key: string) => {
    const k = key.trim();
    // id: 指定なら特定プログラム、それ以外はテーマで解決
    const row = k.startsWith("id:") ? byId.get(k.slice(3).trim()) : map.get(k);
    if (!row) return "";
    if (usedPrograms.has(row.id)) return ""; // 2回目以降の同一広告は出さない
    usedPrograms.add(row.id);
    // アンカーテキストをスニペットから抽出してコピー選択に使う
    const anchorMatch = row.htmlSnippet.match(/<a [^>]*>([^<]+)<\/a>/i);
    const anchorText = anchorMatch?.[1]?.trim() ?? "";
    return wrapAffiliate(row.htmlSnippet, row.name, anchorText, row.strength);
  });
}

/**
 * テーマ→広告の解決マップをデバッグ用に返す（検証スクリプト用）。
 */
export async function resolveAllThemes(): Promise<
  Record<string, { name: string; adType: string | null; priority: number | null; a8mat: string } | null>
> {
  const map = await buildAffiliateMap();
  const result: Record<string, { name: string; adType: string | null; priority: number | null; a8mat: string } | null> = {};
  for (const [theme, row] of map.entries()) {
    const a8matMatch = row.htmlSnippet.match(/a8mat=([A-Z0-9+]+)/);
    result[theme] = {
      name: row.name,
      adType: row.adType,
      priority: row.priority,
      a8mat: a8matMatch ? a8matMatch[1] : "unknown",
    };
  }
  return result;
}
