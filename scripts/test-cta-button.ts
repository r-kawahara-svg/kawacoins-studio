/**
 * CTAボタン JIN:R 描画テスト
 * npx tsx scripts/test-cta-button.ts
 * 複数方式を同一記事に並べてWP上での見た目を確認する。
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const BASE = (process.env.WP_BASE_URL ?? "").replace(/\/$/, "");
const AUTH = "Basic " + Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`).toString("base64");

// ダミーURL（計測タグ構造を保持したまま見た目確認用）
const DUMMY_HREF = "https://px.a8.net/svt/ejp?a8mat=45DXI8+B2WG36+3XCC+64C3M";
const DUMMY_PIXEL = `<img border="0" width="1" height="1" src="https://www16.a8.net/0.gif?a8mat=45DXI8+B2WG36+3XCC+64C3M" alt="">`;

const content = `
<h2>テスト1: JIN:R ショートコード [jin-button]（クラシックエディタ形式）</h2>
<p>JIN旧来のショートコードが有効なら以下がボタンになります。</p>
[jin-button url="${DUMMY_HREF}" color="red" radius="5" rel="nofollow sponsored"]松井証券の口座を無料で開設する ▶[/jin-button]
${DUMMY_PIXEL}

<h2>テスト2: Gutenberg ボタンブロック HTML</h2>
<p>wp-block-button クラスが JIN:R でスタイルされるか確認。</p>
<div class="wp-block-buttons is-content-justification-center">
  <div class="wp-block-button is-style-fill">
    <a class="wp-block-button__link has-background" href="${DUMMY_HREF}" rel="nofollow sponsored" style="background-color:#e44c20">松井証券の口座を無料で開設する ▶</a>
  </div>
</div>
${DUMMY_PIXEL}

<h2>テスト3: JIN:R 独自クラス .jin-btn</h2>
<p>JIN:R テーマCSSが .jin-btn を持つか確認。</p>
<div style="text-align:center;margin:20px 0">
  <a href="${DUMMY_HREF}" rel="nofollow sponsored" class="jin-btn jin-btn-red">松井証券の口座を無料で開設する ▶</a>
</div>
${DUMMY_PIXEL}

<h2>テスト4: 完全インラインCSS（フォールバック候補）</h2>
<p>どのテーマでも崩れない完全自己完結型。</p>
<div style="text-align:center;margin:28px 0">
  <p style="font-size:13px;color:#666;margin:0 0 8px">✔ 無料・最短5分で開設完了</p>
  <a href="${DUMMY_HREF}" rel="nofollow sponsored"
    style="display:inline-block;background:linear-gradient(180deg,#f06a1f 0%,#d94e0a 100%);color:#fff;font-size:16px;font-weight:700;padding:16px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;box-shadow:0 4px 0 #a03800,0 6px 12px rgba(0,0,0,.18);position:relative">
    松井証券の口座を無料で開設する ▶
  </a>
  <p style="font-size:11px;color:#999;margin:10px 0 0">※投資にはリスクがあります</p>
</div>
${DUMMY_PIXEL}

<h2>テスト5: スマホ横幅フル + hover風（外側div width制限）</h2>
<div style="max-width:480px;margin:28px auto;text-align:center">
  <p style="font-size:12px;color:#888;margin:0 0 6px;letter-spacing:0.5px">＼ 無料・最短5分で完了 ／</p>
  <a href="${DUMMY_HREF}" rel="nofollow sponsored"
    style="display:block;width:100%;box-sizing:border-box;background:linear-gradient(180deg,#f47a2a 0%,#db5010 100%);color:#fff;font-size:16px;font-weight:700;padding:18px 20px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;box-shadow:0 4px 0 #963408,0 6px 16px rgba(0,0,0,.2)">
    松井証券の口座を無料で開設する ▶
  </a>
  <p style="font-size:11px;color:#aaa;margin:8px 0 0">※投資にはリスクがあります</p>
</div>
${DUMMY_PIXEL}
`.trim();

async function main() {
  const res = await fetch(`${BASE}/?rest_route=/wp/v2/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: AUTH },
    body: JSON.stringify({
      title: "【CTAボタンテスト】JIN:R各方式確認用（確認後削除可）",
      content,
      status: "draft",
    }),
  });

  if (!res.ok) {
    console.error("WP API error:", res.status, (await res.text()).slice(0, 400));
    process.exit(1);
  }

  const data = await res.json() as { id: number; link: string };
  console.log(`\n✓ テスト下書き作成完了`);
  console.log(`  WP投稿ID: ${data.id}`);
  console.log(`  プレビュー: ${BASE}/?p=${data.id}&preview=true`);
  console.log(`  管理画面: ${BASE}/wp-admin/post.php?post=${data.id}&action=edit`);
  console.log(`\n確認後、WP管理画面から削除してください。`);
}

main().catch(e => { console.error(e); process.exit(1); });
