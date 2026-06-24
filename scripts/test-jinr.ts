/**
 * JIN:R装飾テスト投稿
 * npx tsx scripts/test-jinr.ts
 * → テスト下書きIDを出力。WP管理画面で各装飾の見た目を確認後、手動削除可。
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const BASE = (process.env.WP_BASE_URL ?? "").replace(/\/$/, "");
const AUTH = "Basic " + Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`).toString("base64");

const testContent = `
<!-- テスト1: 標準 mark タグ（黄色マーカー）-->
<p>投資の基本として、<mark>複利の力</mark>を活かすことが重要です。長期保有で<mark>年利7%</mark>を目指すのが定石と言われています。</p>

<!-- テスト2: strong（太字）-->
<p>注意点として、<strong>元本割れリスクは必ず存在します</strong>。どんな商品でもリスクゼロはありません。</p>

<!-- テスト3: 赤字（警告テキスト）-->
<p>特に初心者が陥りがちなのが、<strong style="color:#e53e3e">信用取引での過剰レバレッジ</strong>です。損失が口座残高を超える可能性もあります。</p>

<!-- テスト4: インラインスタイルのノートボックス -->
<div style="border-left:4px solid #38a169;background:#f0fff4;padding:14px 18px;margin:20px 0;border-radius:0 8px 8px 0">
<p style="margin:0;font-weight:600">📌 ポイントまとめ</p>
<p style="margin:8px 0 0">・長期投資が有利<br>・分散投資でリスク低減<br>・手数料の低いインデックスファンドを選ぶ</p>
</div>

<!-- テスト5: インラインスタイルの注意ボックス -->
<div style="border:2px solid #feb2b2;background:#fff5f5;padding:14px 18px;margin:20px 0;border-radius:8px">
<p style="margin:0;color:#c53030;font-weight:700">⚠️ 注意事項</p>
<p style="margin:8px 0 0;color:#2d3748">投資は自己責任です。過去の運用実績は将来の結果を保証しません。</p>
</div>

<!-- テスト6: 吹き出し風コールアウト -->
<div style="background:#fffbeb;border:2px solid #f6c90e;border-radius:12px;padding:14px 18px;margin:20px 0;position:relative">
<p style="margin:0;font-style:italic;color:#5a4a00">💬 正直なところ、最初は怖くて手が出せませんでした。でも少額から始めてみたら思ったより難しくなかった、というのが実感です。</p>
</div>

<!-- テスト7: blockquote（引用）-->
<blockquote><p>「投資で成功する秘訣は、株価が下がったときにパニック売りしないことだ」— ウォーレン・バフェット</p></blockquote>

<!-- テスト8: リスト（ul/ol）-->
<p>選び方のポイントを整理すると：</p>
<ul>
<li>信託報酬0.2%以下のインデックスファンド</li>
<li>純資産残高100億円以上の安定ファンド</li>
<li>分配金再投資型（複利効果を活かす）</li>
</ul>

<!-- テスト9: JIN:Rショートコード試行（テーマ登録あれば描画される）-->
[jin_icon_text text="JIN:Rショートコードテスト" color="green" font_size="14"]

<p><em>以上がJIN:R装飾テスト記事です。各テスト番号の見た目をWP管理画面で確認してください。</em></p>
`.trim();

async function main() {
  const url = `${BASE}/?rest_route=/wp/v2/posts`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: AUTH },
    body: JSON.stringify({
      title: "【装飾テスト】JIN:R HTML装飾確認用（確認後削除可）",
      content: testContent,
      status: "draft",
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("WP API error:", res.status, txt.slice(0, 500));
    process.exit(1);
  }

  const data = await res.json() as { id: number; link: string };
  console.log(`\n✓ テスト下書き作成完了`);
  console.log(`  WP投稿ID: ${data.id}`);
  console.log(`  プレビューURL: ${BASE}/?p=${data.id}&preview=true`);
  console.log(`  管理画面URL: ${BASE}/wp-admin/post.php?post=${data.id}&action=edit`);
  console.log(`\n確認後、WP管理画面から削除してください。`);
}

main().catch(e => { console.error(e); process.exit(1); });
