/**
 * T5 テスト seed
 * npx tsx scripts/seed-t5.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

async function main() {
  const [row] = await db.insert(schema.topics).values({
    source: "idea",
    title: "塩漬け株を損切りして学んだこと — 40万円の失敗から逃げなかった話",
    summary: "2022年にA社株を高値で買い、含み損が拡大しても塩漬けにし続けた。2023年1月に損切り決断、約40万円の損失確定。その後スイングルールを整備した実体験。",
    keyword: "損切り 失敗 塩漬け株",
    revenueScore: 4,
    competition: "low" as const,
    template: "T5",
  }).returning();
  console.log(`✓ [T5] ${row.title} (${row.id})`);
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
