/**
 * Phase 2 生成結果の6項目検証
 * npx tsx scripts/verify-phase2.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";
import { inArray } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

const articleIds = [
  "f0636324-6a66-4953-b5da-e7531104b75a", // T1
  "3490df8a-b519-4942-b219-da6ad54bad48", // T2
  "3c73e395-bcb4-4a8f-98dd-2b4b63ff2b06", // T3
  "d493a646-cdac-414e-b302-dbd59e8ce9ce", // T4
];

async function main() {
  const rows = await db.select().from(schema.articles).where(inArray(schema.articles.id, articleIds));

  for (const a of rows) {
    const tmpl = a.template ?? "none";
    const body = a.bodyMd;
    console.log(`\n${"=".repeat(60)}`);
    console.log(`[${tmpl}] ${a.title}`);
    console.log(`${"=".repeat(60)}`);

    // ① 骨格チェック（H2見出し数）
    const h2s = (body.match(/^## .+/gm) ?? []).length;
    console.log(`① 骨格: H2見出し ${h2s} 個 ${h2s >= 3 ? "✓" : "✗ 少ない"}`);

    // ② experienceSlots
    const expMatches = body.match(/\[EXPERIENCE:[^\]]+\]/g) ?? [];
    const expRemaining = body.match(/\[EXPERIENCE:[^\]]+\](?!\s*\（未使用）)/g) ?? [];
    console.log(`② experienceSlots: ${expMatches.length} 箇所 (未処理: ${expRemaining.length}) ${expMatches.length === 0 || expRemaining.length === 0 ? "✓" : "△ 一部未処理"}`);

    // ③ requiredVisuals
    const visuals = a.visuals as unknown[];
    const tablePH = (body.match(/\[TABLE:[^\]]+\]/g) ?? []).length;
    const stepsPH = (body.match(/\[STEPS:[^\]]+\]/g) ?? []).length;
    const chartPH = (body.match(/\[CHART:[^\]]+\]/g) ?? []).length;
    console.log(`③ visuals: DB=${visuals.length}件, 本文PH(table=${tablePH} steps=${stepsPH} chart=${chartPH})`);

    // ④ ctaThemes ([AFFILIATE:xxx] プレースホルダ)
    const affiliatePHs = body.match(/\[AFFILIATE:[^\]]+\]/g) ?? [];
    console.log(`④ AFFILIATE PH: ${affiliatePHs.join(", ") || "なし"} ${affiliatePHs.length > 0 ? "✓" : "✗ なし"}`);

    // ⑤ FAQ / 開示文
    const faqItems = a.faq as unknown[];
    const hasDisclosure = body.includes("AIの下書き") || body.includes("編集しています");
    const hasRisk = body.includes("元本割れ") || body.includes("リスク");
    console.log(`⑤ FAQ: DB=${faqItems.length}件, 開示文=${hasDisclosure ? "✓" : "✗"}, リスク言及=${hasRisk ? "✓" : "✗"}`);

    // ⑥ ガードレール目視チェック
    const hasDemerit = body.includes("デメリット") || body.includes("注意点") || body.includes("リスク");
    const hasBlanketRec = /絶対儲かる|必ず上がる|この株を買え/.test(body);
    const hasNumbers = /[0-9]+\.[0-9]+%|[0-9]+円/.test(body);
    console.log(`⑥ ガードレール: デメリット言及=${hasDemerit ? "✓" : "✗"}, 一括推奨=${hasBlanketRec ? "✗検出" : "✓なし"}, 数値捏造リスク=${hasNumbers ? "△ 数値あり(要目視)" : "◯"}`);
  }

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
