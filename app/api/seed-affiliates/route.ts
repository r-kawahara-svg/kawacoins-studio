/**
 * GET /api/seed-affiliates — affiliate_programs に A8案件を一括upsert（開発用）
 * 冪等：html_snippet内の a8mat が同じ行はスキップ
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { affiliatePrograms } from "@/db/schema";
import { affiliateSeeds } from "@/db/seeds/affiliates";
import { sql } from "drizzle-orm";

export async function GET() {
  const existing = await db
    .select({ htmlSnippet: affiliatePrograms.htmlSnippet })
    .from(affiliatePrograms);

  const existingA8mats = new Set(
    existing
      .map((r) => {
        const m = r.htmlSnippet.match(/a8mat=([A-Z0-9+]+)/);
        return m ? m[1] : null;
      })
      .filter(Boolean)
  );

  const results: { action: string; name: string; adType: string; a8mat: string }[] = [];

  for (const seed of affiliateSeeds) {
    if (existingA8mats.has(seed.a8mat)) {
      results.push({ action: "skip", name: seed.name, adType: seed.adType, a8mat: seed.a8mat });
      continue;
    }
    await db.insert(affiliatePrograms).values({
      name: seed.name,
      asp: seed.asp,
      themes: seed.themes,
      htmlSnippet: seed.htmlSnippet,
      payout: seed.payout,
      active: seed.active,
      adType: seed.adType,
      note: seed.note,
    });
    results.push({ action: "insert", name: seed.name, adType: seed.adType, a8mat: seed.a8mat });
  }

  const all = await db
    .select({ themes: affiliatePrograms.themes, adType: affiliatePrograms.adType })
    .from(affiliatePrograms)
    .where(sql`${affiliatePrograms.active} = true`);

  const themeCount: Record<string, number> = {};
  for (const row of all) {
    for (const t of (row.themes as string[]) ?? []) {
      themeCount[t] = (themeCount[t] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    inserted: results.filter((r) => r.action === "insert").length,
    skipped: results.filter((r) => r.action === "skip").length,
    total: all.length,
    details: results,
    themeCount,
  });
}
