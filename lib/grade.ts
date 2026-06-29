import type { PageMetric } from "@/lib/analytics";

// ─── 絶対評価（世の中の目安に基づく固定基準）──────────────────────
// 直近365日の累計PVでベース点、平均滞在時間で±1補正 → A〜E。
const PV_BANDS = [
  { min: 10000, pt: 5 },
  { min: 3000, pt: 4 },
  { min: 1000, pt: 3 },
  { min: 300, pt: 2 },
  { min: 0, pt: 1 },
];
const SCORE_TO_GRADE = ["", "E", "D", "C", "B", "A"];

export function gradeOf(m: PageMetric | null): string {
  if (!m) return "";
  const base = PV_BANDS.find(b => m.views >= b.min)?.pt ?? 1;
  const mod = m.engagementSec >= 60 ? 1 : m.engagementSec < 20 ? -1 : 0;
  const score = Math.max(1, Math.min(5, base + mod));
  return SCORE_TO_GRADE[score];
}

// 評価カラー（高い=緑 / やや高い=金 / やや低い=黄 / 低い=赤 のトーン）
export const GRADE_STYLE: Record<string, { bg: string; text: string; bar: string }> = {
  A: { bg: "#a9d6b0", text: "#2f5d3a", bar: "#6fb583" },
  B: { bg: "#f1cf63", text: "#6e5413", bar: "#e0b341" },
  C: { bg: "#f0e36a", text: "#6b6212", bar: "#d8c247" },
  D: { bg: "#f0b86a", text: "#6e4a14", bar: "#e09f48" },
  E: { bg: "#e89a93", text: "#6e2f2a", bar: "#d97a72" },
};
export const GRADE_FALLBACK = { bg: "#eef0f3", text: "#8a93a0", bar: "#cfd5dc" };
