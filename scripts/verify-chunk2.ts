/**
 * Phase 2 チャンク2 自己検証
 * npx tsx scripts/verify-chunk2.ts
 *
 * 確認内容:
 * 1. T5記事の体験スロット一覧
 * 2. 体験未充足で422
 * 3. ダミー体験入力 → 充足チェック
 * 4. 図表HTML生成検証
 * 5. AFFILIATE プレースホルダ確認
 * 6. T5事実不変チェック（骨子が本文で改変されていないか目視用に骨子と本文一部を比較）
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";
import { eq, and } from "drizzle-orm";
import { renderTable, renderSteps, renderChart } from "../lib/visuals";
import type { VisualTable, VisualSteps, VisualChart } from "../lib/visuals";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

const T5_ARTICLE_ID = "309e624b-cbad-4582-98fb-8eab63171b77";
// T1-T4の代表ID（チャンク1で生成済み）
const SAMPLE_IDS: Record<string, string> = {
  T1: "f0636324-6a66-4953-b5da-e7531104b75a",
  T3: "3c73e395-bcb4-4a8f-98dd-2b4b63ff2b06",
  T4: "d493a646-cdac-414e-b302-dbd59e8ce9ce",
};

async function main() {
  console.log("\n===== Phase 2 チャンク2 検証 =====\n");

  // 1. T5 体験スロット
  const t5Exps = await db.select().from(schema.experiences).where(eq(schema.experiences.articleId, T5_ARTICLE_ID));
  console.log("① T5 体験スロット:");
  for (const e of t5Exps) {
    console.log(`  [${e.completed ? "✓" : " "}] ${e.label}`);
  }

  // 2. 体験未充足で publish → 422 チェック（HTTP）
  console.log("\n② 体験未充足 → publish 422チェック (HTTP):");
  try {
    const res = await fetch(`http://localhost:3000/api/articles/${T5_ARTICLE_ID}/publish`, { method: "POST" });
    const data = await res.json() as { error?: string; missing?: string[] };
    if (res.status === 422) {
      console.log(`  ✓ 422 受信: ${data.error} (missing: ${data.missing?.join(", ") ?? "—"})`);
    } else {
      console.log(`  △ 期待 422 だが ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (e) {
    console.log(`  ✗ fetch失敗: ${e} (dev server起動してください)`);
  }

  // 3. ダミー体験入力 → 充足チェック
  console.log("\n③ ダミー体験入力 (API経由):");
  for (const e of t5Exps) {
    const dummyNote = e.label === "失敗の骨子"
      ? "2022年9月、A社(証券コード未開示)を1,500円で100株購入。2023年1月に900円まで下落。損切りして約60,000円の損失確定。根拠のない「底値だろう」という思い込みで塩漬けにした。"
      : "損切りラインを事前に決め（-10%）、それを機械的に守るようにした。今では含み損が-8%になった時点で一部売却する。";

    const res = await fetch(`http://localhost:3000/api/articles/${T5_ARTICLE_ID}/experiences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: e.label, choice: null, note: dummyNote, completed: true }),
    });
    const data = await res.json() as { completed?: boolean };
    console.log(`  [${data.completed ? "✓" : "✗"}] ${e.label}: ${res.status}`);
  }

  // approve
  const approveRes = await fetch(`http://localhost:3000/api/articles/${T5_ARTICLE_ID}/approve`, { method: "POST" });
  const approveData = await approveRes.json() as { status?: string; error?: string; missing?: string[] };
  if (approveRes.ok) {
    console.log(`  ✓ 承認: status=${approveData.status}`);
  } else {
    console.log(`  ✗ 承認失敗 ${approveRes.status}: ${approveData.error} (missing: ${approveData.missing?.join(", ") ?? "—"})`);
  }

  // 4. 図表HTMLレンダリング
  console.log("\n④ 図表HTMLレンダリング:");
  const t5Article = await db.select().from(schema.articles).where(eq(schema.articles.id, T5_ARTICLE_ID));
  if (t5Article.length > 0) {
    const visuals = (t5Article[0].visuals ?? []) as (VisualTable | VisualSteps | VisualChart)[];
    for (const v of visuals) {
      let html = "";
      if (v.kind === "table") html = renderTable(v as VisualTable);
      else if (v.kind === "steps") html = renderSteps(v as VisualSteps);
      else if (v.kind === "chart") html = renderChart(v as VisualChart);

      const hasWrapper = html.includes("overflow-x:auto") || html.includes("border-radius");
      const noXSS = !html.includes("<script");
      console.log(`  [${v.kind}] ${v.title}: len=${html.length} wrapper=${hasWrapper ? "✓" : "✗"} noXSS=${noXSS ? "✓" : "✗"}`);
    }
    if (visuals.length === 0) console.log("  (visuals=0件)");
  }

  // 5. AFFILIATE確認
  console.log("\n⑤ AFILIATEプレースホルダ:");
  for (const [tmpl, id] of Object.entries(SAMPLE_IDS)) {
    const [row] = await db.select({ bodyMd: schema.articles.bodyMd }).from(schema.articles).where(eq(schema.articles.id, id));
    if (!row) continue;
    const phs = row.bodyMd.match(/\[AFFILIATE:[^\]]+\]/g) ?? [];
    console.log(`  ${tmpl}: ${phs.join(", ") || "なし"}`);
  }
  const [t5row] = await db.select({ bodyMd: schema.articles.bodyMd }).from(schema.articles).where(eq(schema.articles.id, T5_ARTICLE_ID));
  if (t5row) {
    const phs = t5row.bodyMd.match(/\[AFFILIATE:[^\]]+\]/g) ?? [];
    console.log(`  T5: ${phs.join(", ") || "なし"}`);
  }

  // 6. T5 事実不変チェック
  console.log("\n⑥ T5 事実不変チェック:");
  const t5Body = t5row?.bodyMd ?? "";
  const FACT_KEYWORDS = ["A社", "1,500円", "900円", "40万", "60,000", "塩漬け", "2022", "2023"];
  let preserved = 0;
  for (const kw of FACT_KEYWORDS) {
    if (t5Body.includes(kw)) preserved++;
    else console.log(`  △ キーワード未検出: "${kw}"`);
  }
  // 本文冒頭200文字を出力（目視用）
  console.log(`  骨子キーワード検出: ${preserved}/${FACT_KEYWORDS.length}`);
  console.log(`  本文冒頭:\n    ${t5Body.slice(0, 300).replace(/\n/g, "\n    ")}`);

  console.log("\n===== 検証完了 =====");
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
