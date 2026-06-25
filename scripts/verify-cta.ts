/**
 * CTAボタン生成の自己検証
 * - rel・計測タグ・マイクロコピー・矢印・グラデーション の確認
 * - 実際のスニペットでテスト下書きをWPに投稿してプレビューURLを出力
 */
import { config } from "dotenv";
config({ path: ".env.local" });
process.env.DATABASE_URL = (process.env.DATABASE_URL ?? "").replace(":6543/", ":5432/");

import { wrapAffiliate } from "@/lib/affiliate";

// 実際のスニペット（DB確認済み）
const SNIPPETS = [
  {
    label: "松井証券 口座開設（text）",
    name: "松井証券 口座開設",
    snippet: `<a href="https://px.a8.net/svt/ejp?a8mat=45DXI8+B2WG36+3XCC+64C3M" rel="nofollow">松井証券</a>\n<img border="0" width="1" height="1" src="https://www16.a8.net/0.gif?a8mat=45DXI8+B2WG36+3XCC+64C3M" alt="">`,
  },
  {
    label: "松井証券 iDeCo（text）",
    name: "松井証券 iDeCo",
    snippet: `<a href="https://px.a8.net/svt/ejp?a8mat=451A36+Z4LGY+3XCC+BXQOI" rel="nofollow">iDeCoならポイントが貯まる松井証券</a>\n<img border="0" width="1" height="1" src="https://www10.a8.net/0.gif?a8mat=451A36+Z4LGY+3XCC+BX" alt="">`,
  },
  {
    label: "FX投資マスターガイド（text）",
    name: "FX投資マスターガイド",
    snippet: `<a href="https://px.a8.net/svt/ejp?a8mat=45DXI8+B1PKVM+ONS+5ZMCI" rel="nofollow">FX投資マスターガイド無料提供中！（図解オールカラー128ページ）</a>\n<img border="0" width="1" height="1" src="https://www19.a8.net/0.gif?a8mat=45DXI8" alt="">`,
  },
  {
    label: "ALTERNA（text）",
    name: "ALTERNA（三井物産デジタル証券）",
    snippet: `<a href="https://px.a8.net/svt/ejp?a8mat=45DXI8+B3HVOY+5PYG+5YRHE" rel="nofollow">預金でも株でもない、安定資産という新しい選択肢</a>\n<img border="0" width="1" height="1" src="https://www10.a8.net/0.gif?a8mat=45DXI8" alt="">`,
  },
  {
    label: "松井証券 バナー（728x90）",
    name: "松井証券 口座開設",
    snippet: `<a href="https://px.a8.net/svt/ejp?a8mat=45DXI8+B2WG36+3XCC+6P4K1" rel="nofollow">\n<img border="0" width="728" height="90" alt="" src="https://www23.a8.net/svt/bgt?aid=250912736670"></a>`,
  },
];

function check(html: string, expectHas: string[], expectNot: string[], label: string) {
  let pass = true;
  for (const s of expectHas) {
    if (!html.includes(s)) { console.error(`  ✗ MISSING "${s}" in ${label}`); pass = false; }
  }
  for (const s of expectNot) {
    if (html.includes(s)) { console.error(`  ✗ UNEXPECTED "${s}" in ${label}`); pass = false; }
  }
  if (pass) console.log(`  ✓ ${label}`);
  return pass;
}

console.log("\n=== CTA HTML 検証 ===");
for (const s of SNIPPETS) {
  const anchorMatch = s.snippet.match(/<a [^>]*>([^<]+)<\/a>/i);
  const anchorText = anchorMatch?.[1]?.trim() ?? "";
  const html = wrapAffiliate(s.snippet, s.name, anchorText);

  if (s.label.includes("バナー")) {
    check(html, ["nofollow sponsored", "overflow-x:auto"], ["linear-gradient"], s.label);
  } else {
    check(html, [
      "nofollow sponsored",         // rel 必須
      "linear-gradient",            // グラデーション
      "▶",                          // 矢印
      "a8.net/0.gif",               // 計測ピクセル保持
      "max-width:480px",            // スマホ幅制限
      "box-shadow",                 // 立体感
      "＼",                          // マイクロコピー
    ], [
      'rel="nofollow"',             // 旧rel（単体）が残らないこと
    ], s.label);
  }
}

// テスト下書きをWPに投稿
async function postTestDraft() {
  console.log("\n=== WPテスト下書き投稿 ===");
  const BASE = (process.env.WP_BASE_URL ?? "").replace(/\/$/, "");
  const AUTH = "Basic " + Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`).toString("base64");

  const ctaBlocks = SNIPPETS.map((s, i) => {
    const anchorMatch = s.snippet.match(/<a [^>]*>([^<]+)<\/a>/i);
    const anchorText = anchorMatch?.[1]?.trim() ?? "";
    return `<h2>テスト${i + 1}: ${s.label}</h2>\n${wrapAffiliate(s.snippet, s.name, anchorText)}`;
  }).join("\n\n");

  const res = await fetch(`${BASE}/?rest_route=/wp/v2/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: AUTH },
    body: JSON.stringify({
      title: "【CTAボタンv2テスト】稼ぐサイト水準ボタン確認用（確認後削除可）",
      content: ctaBlocks,
      status: "draft",
    }),
  });

  if (!res.ok) {
    console.error("WP API error:", res.status, (await res.text()).slice(0, 300));
    process.exit(1);
  }

  const data = await res.json() as { id: number };
  console.log(`✓ WP投稿ID: ${data.id}`);
  console.log(`  プレビュー: ${BASE}/?p=${data.id}&preview=true`);
  console.log(`  管理画面: ${BASE}/wp-admin/post.php?post=${data.id}&action=edit`);
  console.log(`\n確認後、WP管理画面から削除してください。`);
}

postTestDraft().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
