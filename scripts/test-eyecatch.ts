/**
 * アイキャッチPNG生成テスト
 * npx tsx scripts/test-eyecatch.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "fs";
import { generateEyecatchPng } from "@/lib/eyecatch";

const DESKTOP = process.env.USERPROFILE
  ? `${process.env.USERPROFILE}\\Desktop`
  : "/tmp";

const tests = [
  { title: "SBI証券のNISA口座を開設してみた感想【実体験レポート】", tmpl: "T1", kw: "NISA", desc: "SBI証券の使い心地を正直にレポート" },
  { title: "ネット証券10社を徹底比較！手数料・機能・使いやすさランキング", tmpl: "T2", kw: "証券比較", desc: "初心者から上級者まで対応" },
  { title: "【2026年版】iDeCo完全攻略ガイド！節税効果と注意点を解説", tmpl: "T3", kw: "iDeCo", desc: "節税しながら老後資金を積み立てる" },
  { title: "決算速報: トヨタ自動車 2026年3月期 第3四半期決算を独自分析", tmpl: "T4", kw: "トヨタ決算", desc: "アナリスト予想との乖離に注目" },
  { title: "信用取引で300万円溶かした話【失敗談と教訓】", tmpl: "T5", kw: "信用取引", desc: "二度と繰り返さないための反省録" },
  { title: "kawacoin的まとめ記事（テンプレなし）", tmpl: null, kw: "投資", desc: "デフォルトテーマ確認用" },
  {
    title: "これは非常に長いタイトルのテストです。複数行に折り返しても枠内に収まることを確認するためのテスト文章でございます。",
    tmpl: "T1", kw: "長文テスト", desc: "タイトル折り返し確認"
  },
];

async function main() {
  for (const t of tests) {
    const png = await generateEyecatchPng(t.title, t.tmpl, { keyword: t.kw, description: t.desc });
    const safe = (t.tmpl ?? "default") + (t.title.length > 30 ? "-long" : "");
    const path = `${DESKTOP}\\eyecatch-${safe}.png`;
    writeFileSync(path, png);
    console.log(`✓ ${path}  (${png.length.toLocaleString()} bytes)`);
  }
  console.log("\n全テンプレートPNG生成完了");
}

main().catch(e => { console.error(e); process.exit(1); });
