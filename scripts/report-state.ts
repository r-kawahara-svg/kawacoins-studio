import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";
import { getTemplate } from "../lib/templates";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

async function main() {
  // 1. articles
  const arts = await db.select().from(schema.articles).orderBy(schema.articles.createdAt);
  const exps = await db.select().from(schema.experiences);

  console.log("\n=== ARTICLES ===");
  for (const a of arts) {
    const tmpl = getTemplate(a.template);
    const slots = tmpl?.experienceSlots ?? [];
    const myExps = exps.filter(e => e.articleId === a.id);
    const filled = slots.length === 0 ? "n/a" :
      `${myExps.filter(e => e.completed).length}/${slots.length}`;
    const visuals = (a.visuals as unknown[])?.length ?? 0;
    const wpId = a.wpPostId ?? "—";
    console.log(`  ${a.id.slice(0,8)} | ${(a.title).slice(0,40).padEnd(40)} | ${(a.template ?? "—").padEnd(2)} | ${a.status.padEnd(9)} | wp=${wpId} | vis=${visuals} | exp=${filled}`);
  }

  // 2. topics
  const tops = await db.select().from(schema.topics);
  const tmplCounts: Record<string, number> = {};
  for (const t of tops) {
    const k = t.template ?? "—";
    tmplCounts[k] = (tmplCounts[k] ?? 0) + 1;
  }
  console.log(`\n=== TOPICS === total=${tops.length}`);
  for (const [k, v] of Object.entries(tmplCounts)) {
    console.log(`  ${k}: ${v}件`);
  }

  // 3. WP確認
  const published = arts.filter(a => a.wpPostId);
  console.log(`\n=== WP投稿 ===`);
  if (published.length === 0) {
    console.log("  WPに投稿された記事はまだない");
  } else {
    const base = (process.env.WP_BASE_URL ?? "").replace(/\/$/, "");
    const auth = "Basic " + Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`).toString("base64");
    for (const a of published) {
      try {
        const url = `${base}/?rest_route=/wp/v2/posts/${a.wpPostId}`;
        const res = await fetch(url, { headers: { Authorization: auth } });
        if (res.ok) {
          const d = await res.json() as { title: { rendered: string }; status: string };
          console.log(`  wp_post_id=${a.wpPostId} → 「${d.title.rendered}」status=${d.status} ✓`);
        } else {
          console.log(`  wp_post_id=${a.wpPostId} → WP応答 ${res.status}`);
        }
      } catch (e) {
        console.log(`  wp_post_id=${a.wpPostId} → fetch失敗: ${e}`);
      }
    }
  }

  await client.end();
}
main().catch(e => { console.error(e); process.exit(1); });
