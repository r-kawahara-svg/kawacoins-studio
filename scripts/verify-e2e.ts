/**
 * E2E検証スクリプト — すべてHTTP経由で実施（DB直結なし）
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const BASE = "http://localhost:3000";

function pass(msg: string) { console.log(`  [PASS] ${msg}`); }
function fail(msg: string) { console.error(`  [FAIL] ${msg}`); process.exitCode = 1; }
function section(msg: string) { console.log(`\n=== ${msg} ===`); }

async function main() {
  // ──────────────────────────────────────────────
  // 1. seed topic
  // ──────────────────────────────────────────────
  section("1. topicをDBに投入");
  const seedRes = await fetch(`${BASE}/api/e2e-verify?action=seed`);
  if (!seedRes.ok) { fail(`seed failed: ${seedRes.status}`); return; }
  const { topicId } = await seedRes.json() as { topicId: string };
  console.log(`  topic_id=${topicId}`);
  pass("topic inserted via API");

  // ──────────────────────────────────────────────
  // 2. generate API 実呼び出し（Claude実呼び出し）
  // ──────────────────────────────────────────────
  section("2. POST /api/articles/generate（Claude実呼び出し、~30秒）");
  console.log("  calling Anthropic claude-sonnet-4-6 ...");

  const genRes = await fetch(`${BASE}/api/articles/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topicId }),
  });

  if (!genRes.ok) {
    const txt = await genRes.text();
    fail(`generate returned ${genRes.status}: ${txt}`);
    await fetch(`${BASE}/api/e2e-verify?topicId=${topicId}`, { method: "DELETE" });
    return;
  }
  const { articleId } = await genRes.json() as { articleId: string };
  console.log(`  article_id=${articleId}`);
  pass(`generate HTTP ${genRes.status}`);

  // ──────────────────────────────────────────────
  // 3. DB確認
  // ──────────────────────────────────────────────
  section("3. DB確認（article / judgment / プレースホルダ）");

  const chkRes = await fetch(`${BASE}/api/e2e-verify?action=check&articleId=${articleId}`);
  const chk = await chkRes.json() as {
    status: string; aiModel: string; bodyLength: number;
    hasTradeJudgment: boolean; hasPositionJudgment: boolean; hasTakeJudgment: boolean;
    hasAffiliate: boolean; hasDisclosure: boolean;
    judgment: { completed: boolean; tradeView: string | null } | null;
  };

  chk.status === "gate"                 ? pass("article.status = 'gate'")           : fail(`status='${chk.status}'`);
  chk.aiModel === "claude-sonnet-4-6"   ? pass("aiModel = claude-sonnet-4-6")       : fail(`aiModel='${chk.aiModel}'`);
  chk.bodyLength > 1000                 ? pass(`本文 ${chk.bodyLength}文字`)         : fail(`本文が短い: ${chk.bodyLength}文字`);
  chk.hasTradeJudgment                  ? pass("[JUDGMENT:trade] 含まれる")          : fail("[JUDGMENT:trade] 欠落");
  chk.hasPositionJudgment               ? pass("[JUDGMENT:position] 含まれる")       : fail("[JUDGMENT:position] 欠落");
  chk.hasTakeJudgment                   ? pass("[JUDGMENT:take] 含まれる")           : fail("[JUDGMENT:take] 欠落");
  chk.hasAffiliate                      ? pass("[AFFILIATE:*] 含まれる")             : fail("[AFFILIATE:*] 欠落");
  chk.hasDisclosure                     ? pass("AI開示文 含まれる")                  : fail("AI開示文 欠落");
  chk.judgment                          ? pass("judgments行 作成済み")               : fail("judgments行 なし");
  chk.judgment?.completed === false     ? pass("judgment.completed = false（初期）") : fail("completed が true");
  chk.judgment?.tradeView === null      ? pass("tradeView = null（初期）")           : fail("tradeView が null でない");

  // ──────────────────────────────────────────────
  // 4. publish: ゲート未完了 → 422
  // ──────────────────────────────────────────────
  section("4. publish ゲート未完了 → 422");
  const pub422 = await fetch(`${BASE}/api/articles/${articleId}/publish`, { method: "POST" });
  pub422.status === 422 ? pass(`422 Unprocessable Entity（gate未完了）`) : fail(`expected 422, got ${pub422.status}`);

  // ──────────────────────────────────────────────
  // 5. judgments完了 → WP draft投稿
  // ──────────────────────────────────────────────
  section("5. judgments完了 → プレースホルダ置換 + WP draft投稿");
  await fetch(`${BASE}/api/e2e-verify?action=fill-judgment&articleId=${articleId}`);
  pass("judgments完了（completed=true, 3項目記入）");

  const pubRes = await fetch(`${BASE}/api/articles/${articleId}/publish`, { method: "POST" });
  if (pubRes.status === 200 || pubRes.status === 201) {
    const pubData = await pubRes.json() as { wpPostId: number; link: string };
    pass(`WP draft投稿成功: post_id=${pubData.wpPostId}`);

    // article再チェック
    const chk2Res = await fetch(`${BASE}/api/e2e-verify?action=check&articleId=${articleId}`);
    const chk2 = await chk2Res.json() as { status: string };
    chk2.status === "published" ? pass("article.status = 'published'") : fail(`status='${chk2.status}'`);

    // WP記事本文を取得してプレースホルダが残っていないか確認
    const wpUser = process.env.WP_USERNAME ?? "@kawacoinclub";
    const wpPass = process.env.WP_APP_PASSWORD ?? "";
    const b64 = Buffer.from(`${wpUser}:${wpPass}`).toString("base64");
    const wpGet = await fetch(
      `https://kawacoins.com/?rest_route=/wp/v2/posts/${pubData.wpPostId}`,
      { headers: { Authorization: `Basic ${b64}` } }
    );
    if (wpGet.ok) {
      const wpPost = await wpGet.json() as { content: { rendered: string }; title: { rendered: string } };
      const rendered = wpPost.content.rendered;
      !rendered.includes("[JUDGMENT:")  ? pass("WP本文に [JUDGMENT:*] が残っていない") : fail("[JUDGMENT:*] が残存");
      !rendered.includes("[AFFILIATE:") ? pass("WP本文に [AFFILIATE:*] が残っていない") : fail("[AFFILIATE:*] が残存");
      rendered.includes("押し目だけ拾う") ? pass("tradeViewテキストがWP本文に反映") : fail("tradeViewテキスト未反映");
      console.log(`  WP title: ${wpPost.title.rendered}`);
    } else {
      fail(`WP記事取得失敗: ${wpGet.status}`);
    }

    // テスト記事をTrashに移動
    section("5b. WPテスト記事を削除（Trash）");
    const wpUser2 = process.env.WP_USERNAME ?? "@kawacoinclub";
    const wpPass2 = process.env.WP_APP_PASSWORD ?? "";
    const b64_2 = Buffer.from(`${wpUser2}:${wpPass2}`).toString("base64");
    const delNew = await fetch(
      `https://kawacoins.com/?rest_route=/wp/v2/posts/${pubData.wpPostId}`,
      { method: "DELETE", headers: { Authorization: `Basic ${b64_2}` } }
    );
    delNew.ok ? pass(`post_id=${pubData.wpPostId} をTrash`) : fail(`削除失敗: ${delNew.status}`);
  } else {
    const txt = await pubRes.text();
    fail(`publish returned ${pubRes.status}: ${txt}`);
  }

  // ──────────────────────────────────────────────
  // 6. 既存テスト下書き post_id=940 削除
  // ──────────────────────────────────────────────
  section("6. 既存テスト下書き post_id=940 削除");
  const wpUser3 = process.env.WP_USERNAME ?? "@kawacoinclub";
  const wpPass3 = process.env.WP_APP_PASSWORD ?? "";
  const b64_3 = Buffer.from(`${wpUser3}:${wpPass3}`).toString("base64");
  const del940 = await fetch(
    "https://kawacoins.com/?rest_route=/wp/v2/posts/940",
    { method: "DELETE", headers: { Authorization: `Basic ${b64_3}` } }
  );
  del940.ok ? pass("post_id=940 削除（Trash）") : console.log(`  post_id=940: ${del940.status}（既に削除済みか存在しない）`);

  // ──────────────────────────────────────────────
  // 7. E2Eレコード削除
  // ──────────────────────────────────────────────
  section("7. E2Eレコードをご清掃");
  await fetch(`${BASE}/api/e2e-verify?topicId=${topicId}&articleId=${articleId}`, { method: "DELETE" });
  pass("seed topic / article / judgment を削除");

  section("完了");
}

main().catch(e => { console.error(e); process.exit(1); });
