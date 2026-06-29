import { listWpPosts, type WpPostSummary } from "@/lib/wp";
import { getPageMetrics, lookupMetric, type PageMetric } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  publish: "公開", draft: "下書き", pending: "承認待ち", private: "非公開",
};

// 落ち着いた評価カラー（彩度を抑えた統一トーン）
const GRADE_COLOR: Record<string, string> = {
  A: "#3f7d6e", B: "#5f8a8f", C: "#8a8f98", D: "#a98a63", E: "#a8736b",
};

// ─── 絶対評価ロジック（世の中の目安に基づく固定基準）──────────────
// 1記事あたり「直近365日の累計PV」を基準にベース点、平均滞在時間で補正。
const PV_BANDS = [
  { min: 10000, pt: 5, label: "10,000PV以上" },
  { min: 3000, pt: 4, label: "3,000〜9,999PV" },
  { min: 1000, pt: 3, label: "1,000〜2,999PV" },
  { min: 300, pt: 2, label: "300〜999PV" },
  { min: 0, pt: 1, label: "300PV未満" },
];
const SCORE_TO_GRADE = ["", "E", "D", "C", "B", "A"]; // index 1..5

function gradeOf(m: PageMetric | null): string {
  if (!m) return "";
  const base = PV_BANDS.find(b => m.views >= b.min)?.pt ?? 1;
  // 平均滞在時間で ±1 補正（読まれている=加点 / すぐ離脱=減点）
  const mod = m.engagementSec >= 60 ? 1 : m.engagementSec < 20 ? -1 : 0;
  const score = Math.max(1, Math.min(5, base + mod));
  return SCORE_TO_GRADE[score];
}

interface Row extends WpPostSummary { metric: PageMetric | null; grade: string; }

function fmtSec(s: number): string {
  if (s <= 0) return "0秒";
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}分${sec}秒` : `${sec}秒`;
}

export default async function AnalyticsPage() {
  let posts: WpPostSummary[] = [];
  let loadError: string | null = null;
  try {
    posts = await listWpPosts();
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }
  posts = posts.filter(p => p.status !== "future"); // 予約記事は除外

  const pm = await getPageMetrics(365);

  const rows: Row[] = posts
    .map(p => ({ ...p, metric: lookupMetric(pm, p.link, p.id) }))
    .sort((a, b) => (b.metric?.views ?? -1) - (a.metric?.views ?? -1))
    .map(r => ({ ...r, grade: gradeOf(r.metric) }));

  const totalViews = rows.reduce((s, r) => s + (r.metric?.views ?? 0), 0);
  const totalUsers = rows.reduce((s, r) => s + (r.metric?.users ?? 0), 0);
  const maxViews = Math.max(1, ...rows.map(r => r.metric?.views ?? 0));

  const cardLabel = { fontSize: 12, color: "#6b7280" } as const;
  const cardNum = { fontSize: 26, fontWeight: 700, fontFamily: "monospace", marginTop: 4, color: "#1f2937" } as const;

  return (
    <div style={{ padding: "20px 16px 60px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b7280", fontWeight: 600, fontFamily: "monospace", marginBottom: 16 }}>
        アクセス解析
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1f2937", margin: "0 0 4px" }}>
        ページの閲覧数と評価
      </h1>
      <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>
        Google Analytics の直近365日のデータ。世の中の目安に基づく絶対評価でA〜Eを付けています（予約記事は除外）。
      </p>

      {pm.configured && !pm.error && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ background: "#fff", border: "1px solid #e3e6ea", borderRadius: 12, padding: "16px 22px", minWidth: 160 }}>
            <div style={cardLabel}>合計PV（365日）</div>
            <div style={cardNum}>{totalViews.toLocaleString()}</div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e3e6ea", borderRadius: 12, padding: "16px 22px", minWidth: 140 }}>
            <div style={cardLabel}>合計ユーザー</div>
            <div style={cardNum}>{totalUsers.toLocaleString()}</div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e3e6ea", borderRadius: 12, padding: "16px 22px", minWidth: 110 }}>
            <div style={cardLabel}>記事数</div>
            <div style={cardNum}>{rows.length}</div>
          </div>
        </div>
      )}

      {/* 評価基準の説明 */}
      <details style={{ background: "#f7f8fa", border: "1px solid #e3e6ea", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
        <summary style={{ fontSize: 13, fontWeight: 700, color: "#374151", cursor: "pointer" }}>評価の計算式（絶対評価）</summary>
        <div style={{ fontSize: 12.5, color: "#4b5563", lineHeight: 1.8, marginTop: 10 }}>
          <div style={{ marginBottom: 8 }}>
            ① 直近365日の累計PVでベース点（5段階）:
            <div style={{ marginTop: 4, fontFamily: "monospace", fontSize: 11.5, color: "#6b7280" }}>
              10,000PV以上=5 / 3,000〜=4 / 1,000〜=3 / 300〜=2 / 300未満=1
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            ② 平均滞在時間で補正: 60秒以上で +1、20秒未満で −1（しっかり読まれているかの質を加味）
          </div>
          <div>
            ③ 合計点（1〜5にクランプ）を <strong>5=A / 4=B / 3=C / 2=D / 1=E</strong> に変換。
          </div>
          <div style={{ marginTop: 8, color: "#6b7280" }}>
            ※ 個人ブログ記事の一般的な目安。サイト規模が大きくなったら基準値は見直してください。
          </div>
        </div>
      </details>

      {!pm.configured && (
        <div style={{ background: "#fbf6e9", border: "1px solid #e6d2a0", borderRadius: 10, padding: "12px 16px", color: "#8a6d2f", fontSize: 13, marginBottom: 16 }}>
          PVを表示するにはGoogle Analytics（GA4）の連携設定が必要です。
        </div>
      )}
      {pm.configured && pm.error && (
        <div style={{ background: "#faf0ef", border: "1px solid #e0b8b3", borderRadius: 10, padding: "12px 16px", color: "#9c4f47", fontSize: 13, marginBottom: 16 }}>
          GA4からのPV取得に失敗しました: {pm.error}
        </div>
      )}
      {loadError && (
        <div style={{ background: "#faf0ef", border: "1px solid #e0b8b3", borderRadius: 10, padding: "12px 16px", color: "#9c4f47", fontSize: 13, marginBottom: 16 }}>
          WordPress記事の読み込みに失敗: {loadError}
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #e3e6ea", borderRadius: 12, overflow: "hidden" }}>
        {rows.length === 0 && (
          <div style={{ padding: "32px", textAlign: "center", color: "#6b7280", fontSize: 13 }}>記事がありません</div>
        )}
        {rows.map((r, i) => {
          const v = r.metric?.views ?? 0;
          const barPct = Math.round((v / maxViews) * 100);
          const gradeColor = GRADE_COLOR[r.grade] ?? "#aab0b8";
          return (
            <div key={r.id} style={{ padding: "12px 16px", borderBottom: "1px solid #eef0f3" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#aab0b8", fontFamily: "monospace", minWidth: 22, textAlign: "right" }}>{i + 1}</span>
                <span style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: gradeColor, color: "#fff", fontWeight: 700, fontSize: 15,
                  display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace",
                }}>{r.grade || "—"}</span>
                <span style={{ background: "#eef0f3", color: "#5b6470", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700, fontFamily: "monospace", flexShrink: 0 }}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
                <a href={r.link} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: "#1f2937", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</a>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginLeft: 64, marginTop: 6, fontSize: 11.5, color: "#6b7280", fontFamily: "monospace", flexWrap: "wrap" }}>
                <span style={{ color: r.metric == null ? "#aab0b8" : "#374151", fontWeight: 700 }}>
                  {r.metric == null ? "PV —" : `${v.toLocaleString()} PV`}
                </span>
                <span>ユーザー {r.metric?.users?.toLocaleString() ?? "—"}</span>
                <span>平均滞在 {r.metric ? fmtSec(r.metric.engagementSec) : "—"}</span>
              </div>
              {r.metric != null && (
                <div style={{ height: 4, background: "#eef0f3", borderRadius: 2, marginTop: 6, marginLeft: 64, overflow: "hidden" }}>
                  <div style={{ width: `${barPct}%`, height: "100%", background: gradeColor }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
