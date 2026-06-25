import { config } from "dotenv";
config({ path: ".env.local" });
process.env.DATABASE_URL = (process.env.DATABASE_URL ?? "").replace(":6543/", ":5432/");

async function main() {
  const { db } = await import("@/db");
  const { articles } = await import("@/db/schema");
  const { like, or } = await import("drizzle-orm");

  const suspects = await db
    .select({ id: articles.id, title: articles.title, status: articles.status, wpPostId: articles.wpPostId, createdAt: articles.createdAt })
    .from(articles)
    .where(or(
      like(articles.title, "%2024%"),
      like(articles.title, "%2023%"),
      like(articles.title, "%テスト%"),
    ));

  console.log("=== 要確認記事（旧年号/テスト） ===");
  if (suspects.length === 0) { console.log("なし"); }
  for (const a of suspects) {
    console.log(`[${a.status}] ${a.title.slice(0, 70)} | WP:${a.wpPostId ?? "なし"}`);
    console.log(`   ID: ${a.id}`);
  }

  const all = await db.select({ id: articles.id, title: articles.title, status: articles.status }).from(articles);
  console.log(`\n=== 全記事 (${all.length}件) ===`);
  for (const a of all) {
    console.log(`[${a.status}] ${a.title.slice(0, 70)}`);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
