import { config } from "dotenv";
config({ path: ".env.local" });
process.env.DATABASE_URL = (process.env.DATABASE_URL ?? "").replace(":6543/", ":5432/");

async function main() {
  const { db } = await import("@/db");
  const { topics } = await import("@/db/schema");
  const { like, or, sql } = await import("drizzle-orm");

  const rows = await db.select({ id: topics.id, title: topics.title, status: topics.status })
    .from(topics)
    .where(or(like(topics.title, "%2024%"), like(topics.title, "%2023%")))
    .limit(50);

  console.log("old-year topics found:", rows.length);
  const currentYear = new Date().getFullYear();
  let updated = 0;
  for (const r of rows) {
    // 「2024年」も「2024】」も「2024」単体も全置換
    const newTitle = r.title
      .replace(/2024/g, `${currentYear}`)
      .replace(/2023/g, `${currentYear}`);
    if (newTitle !== r.title) {
      await db.update(topics).set({ title: newTitle }).where(sql`id = ${r.id}`);
      console.log(`  ✓ ${r.title.slice(0, 50)} → ${newTitle.slice(0, 50)}`);
      updated++;
    } else {
      console.log(`  = (no change) ${r.title.slice(0, 50)}`);
    }
  }
  console.log(`updated ${updated} rows`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
