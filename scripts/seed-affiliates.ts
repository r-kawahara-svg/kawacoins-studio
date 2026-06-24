/**
 * scripts/seed-affiliates.ts
 * affiliate_programs に A8案件を一括upsert（冪等：a8mat重複はskip）
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../db";
import { affiliatePrograms } from "../db/schema";
import { affiliateSeeds } from "../db/seeds/affiliates";
import { sql } from "drizzle-orm";

async function main() {
  // 現在のDB全件取得して html_snippet から a8mat を抽出
  const existing = await db.select({ htmlSnippet: affiliatePrograms.htmlSnippet }).from(affiliatePrograms);
  const existingA8mats = new Set(
    existing.map(r => {
      const m = r.htmlSnippet.match(/a8mat=([A-Z0-9+]+)/);
      return m ? m[1] : null;
    }).filter(Boolean)
  );

  let inserted = 0;
  let skipped = 0;

  for (const seed of affiliateSeeds) {
    if (existingA8mats.has(seed.a8mat)) {
      console.log(`  skip: ${seed.name} (${seed.a8mat})`);
      skipped++;
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
    console.log(`  insert: ${seed.name} [${seed.adType}] (${seed.a8mat})`);
    inserted++;
  }

  console.log(`\n完了: ${inserted}件挿入, ${skipped}件スキップ`);

  // テーマ別件数サマリ
  const all = await db.select({
    themes: affiliatePrograms.themes,
    adType: affiliatePrograms.adType,
    name: affiliatePrograms.name,
  }).from(affiliatePrograms).where(sql`${affiliatePrograms.active} = true`);

  const themeCount: Record<string, number> = {};
  for (const row of all) {
    const themes = (row.themes as string[]) ?? [];
    for (const t of themes) {
      themeCount[t] = (themeCount[t] ?? 0) + 1;
    }
  }
  console.log("\nテーマ別件数:");
  for (const [theme, count] of Object.entries(themeCount).sort()) {
    console.log(`  ${theme}: ${count}件`);
  }

  console.log(`\n総件数: ${all.length}件`);
}

main().catch(e => { console.error(e); process.exit(1); });
