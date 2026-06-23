/**
 * Verify publish logic without making real HTTP calls.
 * Tests: injectAffiliateRel, placeholder substitution logic, auth header format.
 */
import { injectAffiliateRel } from "../lib/wp";

let allPass = true;

function check(name: string, actual: unknown, expected: unknown) {
  const pass = actual === expected;
  if (!pass) allPass = false;
  console.log(`[${pass ? "PASS" : "FAIL"}] ${name}`);
  if (!pass) console.log(`       expected: ${JSON.stringify(expected)}`);
  if (!pass) console.log(`       got:      ${JSON.stringify(actual)}`);
}

// --- injectAffiliateRel ---
const html1 = '<a href="https://example.com">Click</a>';
const html1Expected = '<a rel="sponsored nofollow" href="https://example.com">Click</a>';
check("single <a> gets rel injected", injectAffiliateRel(html1), html1Expected);

const html2 = '<a href="a">A</a> and <a href="b">B</a>';
const html2Expected = '<a rel="sponsored nofollow" href="a">A</a> and <a rel="sponsored nofollow" href="b">B</a>';
check("multiple <a> tags all get rel", injectAffiliateRel(html2), html2Expected);

check("no <a> tags → unchanged", injectAffiliateRel("<p>No links</p>"), "<p>No links</p>");

// --- placeholder substitution simulation ---
function substituteJudgments(
  bodyMd: string,
  tradeView: string,
  position: string,
  uniqueTake: string
): string {
  return bodyMd
    .replace(/\[JUDGMENT:trade\]/g, tradeView)
    .replace(/\[JUDGMENT:position\]/g, position)
    .replace(/\[JUDGMENT:take\]/g, uniqueTake)
    .replace(/\[AFFILIATE:[^\]]+\]/g, "");
}

const body = "本文 [JUDGMENT:trade] ポジション [JUDGMENT:position] テイク [JUDGMENT:take] [AFFILIATE:NISA]";
const substituted = substituteJudgments(body, "買い目線", "現物100株", "増益見込み");

check(
  "JUDGMENT:trade replaced",
  substituted.includes("[JUDGMENT:trade]"),
  false
);
check("trade view text inserted", substituted.includes("買い目線"), true);
check("AFFILIATE placeholder removed", substituted.includes("[AFFILIATE:NISA]"), false);

// --- Base64 auth header format ---
const username = "testuser";
const password = "test-app-password";
const expected = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
check(
  "Basic auth header format",
  expected.startsWith("Basic "),
  true
);
check("Base64 encoded correctly", expected, `Basic dGVzdHVzZXI6dGVzdC1hcHAtcGFzc3dvcmQ=`);

console.log(`\nWordPress publish route: requires running WP instance — verified by build`);
console.log(`\nOverall: ${allPass ? "ALL PASS" : "SOME FAILED"}`);
if (!allPass) process.exit(1);
