import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";

async function main() {
  // DDL は Session pooler (port 5432) で実行
  const url = (process.env.DATABASE_URL ?? "").replace(":6543/", ":5432/");
  const client = postgres(url, { prepare: false });
  const db = drizzle(client);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS api_usage (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      operation TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      article_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log("OK: api_usage table created");
  await client.end();
  process.exit(0);
}

main().catch(e => { console.error(e.message ?? e); process.exit(1); });
