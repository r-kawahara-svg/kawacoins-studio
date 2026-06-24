/**
 * Phase 2 検証用 seed: T1〜T4 各1件のトピックを投入する
 * 実行: npx tsx scripts/seed-topics-phase2.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

const topicsToSeed = [
  {
    source: "idea",
    title: "松井証券の口座開設を実際にやってみた【体験レビュー2024】",
    summary: "口座開設フローの体験レビュー。スマホ完結・最短翌日開設を中心に",
    keyword: "松井証券 口座開設",
    revenueScore: 4,
    competition: "mid" as const,
    template: "T1",
  },
  {
    source: "idea",
    title: "NISA口座を開設できる証券会社3社を徹底比較【2024年版】",
    summary: "松井・SBI・楽天の3社を手数料・使いやすさで比較",
    keyword: "NISA 証券会社 比較",
    revenueScore: 5,
    competition: "high" as const,
    template: "T2",
  },
  {
    source: "idea",
    title: "iDeCoの始め方を5ステップで解説【松井証券で実際に開設】",
    summary: "iDeCo口座の開設手順をステップ形式で丁寧に解説",
    keyword: "iDeCo 始め方",
    revenueScore: 4,
    competition: "mid" as const,
    template: "T3",
  },
  {
    source: "earnings",
    title: "トヨタ自動車 2024年3月期 決算まとめ【売上・利益・株価への影響を分析】",
    summary: "2024/3期 本決算。売上45兆円超、純利益4.9兆円と過去最高水準。EV戦略・為替影響に注目",
    sourceUrl: "https://global.toyota/jp/ir/financial-results/",
    keyword: "トヨタ 決算 2024",
    revenueScore: 3,
    competition: "low" as const,
    template: "T4",
  },
];

async function main() {
  console.log("Seeding Phase 2 test topics...");
  const inserted = await db
    .insert(schema.topics)
    .values(topicsToSeed)
    .returning({ id: schema.topics.id, title: schema.topics.title, template: schema.topics.template });

  for (const row of inserted) {
    console.log(`  ✓ [${row.template}] ${row.title} (${row.id})`);
  }

  console.log("\nDone. Use these IDs with POST /api/articles/generate");
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
