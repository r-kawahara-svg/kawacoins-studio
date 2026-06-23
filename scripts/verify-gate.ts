import { isJudgmentComplete, hasRequiredPlaceholders, gateStatus } from "../lib/gate";

let allPass = true;

function check(name: string, actual: unknown, expected: unknown) {
  const pass = actual === expected;
  if (!pass) allPass = false;
  console.log(`[${pass ? "PASS" : "FAIL"}] ${name}`);
  if (!pass) console.log(`       expected: ${expected}, got: ${actual}`);
}

// --- isJudgmentComplete ---
check(
  "empty judgment → incomplete",
  isJudgmentComplete({ tradeView: null, position: null, uniqueTake: null, completed: false }),
  false
);

check(
  "partial judgment → incomplete",
  isJudgmentComplete({ tradeView: "買い目線", position: null, uniqueTake: null, completed: false }),
  false
);

check(
  "all filled → complete",
  isJudgmentComplete({ tradeView: "買い目線", position: "現物100株", uniqueTake: "増益見込み", completed: true }),
  true
);

check(
  "whitespace-only fields → incomplete",
  isJudgmentComplete({ tradeView: "  ", position: "\t", uniqueTake: "\n", completed: false }),
  false
);

// --- hasRequiredPlaceholders ---
const fullBody = `## タイトル\n\n[JUDGMENT:trade]\n\n[JUDGMENT:position]\n\n[JUDGMENT:take]\n\nこの記事はAIの下書きをもとに運営者が編集しています`;
const partialBody = `## タイトル\n\n[JUDGMENT:trade]\n\n本文`;

check("full body has all placeholders", hasRequiredPlaceholders(fullBody), true);
check("partial body missing placeholders", hasRequiredPlaceholders(partialBody), false);
check("empty body missing placeholders", hasRequiredPlaceholders(""), false);

// --- gateStatus ---
const completeJudgment = { tradeView: "A", position: "B", uniqueTake: "C", completed: true };
const incompleteJudgment = { tradeView: null, position: null, uniqueTake: null, completed: false };

check("complete judgment + full body → closed", gateStatus(completeJudgment, fullBody), "closed");
check("complete judgment + partial body → open", gateStatus(completeJudgment, partialBody), "open");
check("incomplete judgment + full body → open", gateStatus(incompleteJudgment, fullBody), "open");

console.log(`\nOverall: ${allPass ? "ALL PASS" : "SOME FAILED"}`);
if (!allPass) process.exit(1);
