/**
 * DEV_AUTH_BYPASS の動作検証
 * npx tsx scripts/verify-bypass.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

// isBypassEnabled のロジックをインライン検証
function isBypassEnabled(nodeEnv: string, flag: string | undefined): boolean {
  if (nodeEnv === "production") return false;
  return flag === "true";
}

console.log("=== isBypassEnabled ロジック検証 ===");

const cases: [string, string | undefined, boolean][] = [
  ["development", "true",  true],   // 開発 + フラグ=true → バイパス有効
  ["development", "false", false],  // 開発 + フラグ=false → 無効
  ["development", undefined, false],// 開発 + フラグなし → 無効
  ["production",  "true",  false],  // 本番 + フラグ=true でも → 必ず無効（二重ガード）
  ["production",  "false", false],  // 本番 + フラグ=false → 無効
];

let allOk = true;
for (const [env, flag, expected] of cases) {
  const result = isBypassEnabled(env, flag);
  const ok = result === expected;
  if (!ok) allOk = false;
  console.log(`  NODE_ENV=${env} DEV_AUTH_BYPASS=${flag ?? "(unset)"} → ${result} ${ok ? "✓" : "✗ FAIL"}`);
}

// 現在の実際の環境変数で確認
const actualBypass = process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "true";
const email = process.env.ALLOWED_EMAIL;
console.log(`\n現在の環境:`);
console.log(`  NODE_ENV=${process.env.NODE_ENV}`);
console.log(`  DEV_AUTH_BYPASS=${process.env.DEV_AUTH_BYPASS}`);
console.log(`  → バイパス有効: ${actualBypass}`);
console.log(`  → ダミーユーザー: ${email ?? "(ALLOWED_EMAIL未設定)"}`);

console.log(`\n総合: ${allOk ? "✓ 全ケース正常" : "✗ 失敗あり"}`);
process.exit(allOk ? 0 : 1);
