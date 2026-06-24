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

/**
 * [AFFILIATE:テーマ] を html_snippet に置換。
 * - rel="sponsored nofollow" を全 <a> に保証（既存 rel は置換）
 * - モバイル対応ラッパー付与
 * - 該当広告なしの場合はプレースホルダを除去
 */
export function wrapAffiliate(html: string): string {
  // rel="sponsored nofollow" を保証（既存の rel= があれば上書き、なければ付与）
  let out = html.replace(/<a ([^>]*?)>/g, (_, attrs: string) => {
    // rel 属性を除去してから付与
    const noRel = attrs.replace(/\s*rel="[^"]*"/, "");
    return `<a rel="sponsored nofollow" ${noRel}>`;
  });
  return `<div style="max-width:100%;overflow-x:auto;text-align:center">\n${out}\n</div>`;
}

/**
 * Markdown 本文中の [AFFILIATE:テーマ] を置換して返す。
 * DB アクセスを伴うため async。
 */
export async function replaceAffiliatePlaceholders(bodyMd: string): Promise<string> {
  const map = await buildAffiliateMap();

  return bodyMd.replace(/\[AFFILIATE:([^\]]+)\]/g, (_, theme: string) => {
    const row = map.get(theme.trim());
    if (!row) return ""; // 該当なし → 除去
    return wrapAffiliate(row.htmlSnippet);
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
