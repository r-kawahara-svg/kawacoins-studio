import { config } from "dotenv";
config({ path: ".env.local" });
process.env.DATABASE_URL = (process.env.DATABASE_URL ?? "").replace(":6543/", ":5432/");

async function main() {
  const { db } = await import("@/db");
  const { affiliatePrograms } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const rows = await db.select().from(affiliatePrograms).where(eq(affiliatePrograms.active, true));
  for (const r of rows) {
    console.log(`\n[${r.name}] adType=${r.adType} priority=${r.priority}`);
    console.log("  snippet:", r.htmlSnippet.slice(0, 200));
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
