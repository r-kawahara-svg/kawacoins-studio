import Anthropic from "@anthropic-ai/sdk";
import { listWpPosts, type WpPostSummary } from "@/lib/wp";
import { getPageMetrics, lookupMetric, type PageMetric } from "@/lib/analytics";
import { trackUsage } from "@/lib/track-usage";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  publish: "公開", draft: "下書き", pending: "承認待ち", private: "非公開",
};

const GRADE_COLOR: Record<string, string> = {
  A: "#0f766b", B: "#2563eb", C: "#b07d2e", D: "#d9730d", E: "#c4453a",
};

interface Row extends WpPostSummary {
  metric: PageMetric | null;
  grade: string;
  reason: string;
}

// AIで記事をA〜E評価（1回のClaude呼び出しでまとめて）
async function gradeArticles(
  items: { id: number; title: string; metric: PageMetric }[]
): Promise<Map<number, { grade: string; reason: string }>> {
  const out = new Map<number, { grade: string; reason: string }>();
  if (items.length === 0 || !process.env.ANTHROPIC_API_KEY) return out;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const table = items.map(it =>
      `id=${it.id} PV=${it.metric.views} ユーザー=${it.metric.users} 平均滞在=${it.metric.engagementSec}秒 「${it.title.slice(0, 30)}」`
    ).join("\n");
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `投資ブログ記事のアクセス指標です。各記事を総合的にA〜Eで評価してください（A=最も良い、E=要改善）。
PVの多さ・ユーザー数・平均滞在時間(エンゲージメント)を総合判断し、この記事群の中での相対評価で付ける。
PVが多くても滞在が極端に短い記事は評価を下げる等、質も加味する。

${table}

各記事をJSONで返す: [{ "id": 123, "grade": "A", "reason": "短い理由(20字以内)" }]。JSONのみ返す。`,
      }],
    });
    void trackUsage({ operation: "analytics_grade", model: "claude-haiku-4-5", inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens });
    const text = msg.content.filter(b => b.type === "text").map(b => (b as { text: string }).text).join("").trim();
    const json = text.match(/\[[\s\S]*\]/);
    if (json) {
      const arr = JSON.parse(json[0]) as { id: number; grade: string; reason: string }[];
      for (const a of arr) {
        if (a.id != null) out.set(Number(a.id), { grade: (a.grade ?? "").toUpperCase(), reason: a.reason ?? "" });
      }
    }
  } catch {
    /* 評価失敗時はグレード無しで表示 */
  }
  return out;
}

export default async function AnalyticsPage() {
  let posts: WpPostSummary[] = [];
  let loadError: string | null = null;
  try {
    posts = await listWpPosts();
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }
  // 予約(future)記事は除外
  posts = posts.filter(p => p.status !== "future");

  const pm = await getPageMetrics(365);

  // 指標を引いてPV降順
  const withMetric = posts
    .map(p => ({ ...p, metric: lookupMetric(pm, p.link, p.id) }))
    .sort((a, b) => (b.metric?.views ?? -1) - (a.metric?.views ?? -1));

  // AI評価（指標があるものだけ）
  const gradable = withMetric.filter(r => r.metric).map(r => ({ id: r.id, title: r.title, metric: r.metric! }));
  const grades = await gradeArticles(gradable);

  const rows: Row[] = withMetric.map(r => {
    const g = grades.get(r.id);
    return { ...r, grade: g?.grade ?? "", reason: g?.reason ?? "" };
  });

  const totalViews = rows.reduce((s, r) => s + (r.metric?.views ?? 0), 0);
  const totalUsers = rows.reduce((s, r) => s + (r.metric?.users ?? 0), 0);
  const maxViews = Math.max(1, ...rows.map(r => r.metric?.views ?? 0));

  function fmtSec(s: number): string {
    if (s <= 0) return "0秒";
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}分${sec}秒` : `${sec}秒`;
  }

  return (
    <div style={{ padding: "20px 16px 60px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#697587", fontWeight: 600, fontFamily: "monospace", marginBottom: 16 }}>
        アクセス解析
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#161d2b", margin: "0 0 4px" }}>
        ページの閲覧数とAI評価
      </h1>
      <p style={{ fontSize: 13, color: "#697587", margin: "0 0 20px" }}>
        Google Analytics の直近365日のデータ。PV・ユーザー数・平均滞在時間からAIが総合的にA〜E評価しています（予約記事は除外）。
      </p>

      {pm.configured && !pm.error && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ background: "#0f766b", color: "#fff", borderRadius: 12, padding: "16px 22px", minWidth: 160 }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>合計PV（365日）</div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "monospace", marginTop: 4 }}>{totalViews.toLocaleString()}</div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #dce1e8", borderRadius: 12, padding: "16px 22px", minWidth: 140 }}>
            <div style={{ fontSize: 12, color: "#697587" }}>合計ユーザー</div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "monospace", marginTop: 4, color: "#161d2b" }}>{totalUsers.toLocaleString()}</div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #dce1e8", borderRadius: 12, padding: "16px 22px", minWidth: 120 }}>
            <div style={{ fontSize: 12, color: "#697587" }}>記事数</div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "monospace", marginTop: 4, color: "#161d2b" }}>{rows.length}</div>
          </div>
        </div>
      )}

      {!pm.configured && (
        <div style={{ background: "#fffbeb", border: "1px solid #f6c90e", borderRadius: 10, padding: "12px 16px", color: "#92400e", fontSize: 13, marginBottom: 16 }}>
          PVを表示するにはGoogle Analytics（GA4）の連携設定が必要です。
        </div>
      )}
      {pm.configured && pm.error && (
        <div style={{ background: "#fff5f5", border: "1px solid #feb2b2", borderRadius: 10, padding: "12px 16px", color: "#c4453a", fontSize: 13, marginBottom: 16 }}>
          GA4からのPV取得に失敗しました: {pm.error}
        </div>
      )}
      {loadError && (
        <div style={{ background: "#fff5f5", border: "1px solid #feb2b2", borderRadius: 10, padding: "12px 16px", color: "#c4453a", fontSize: 13, marginBottom: 16 }}>
          WordPress記事の読み込みに失敗: {loadError}
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #dce1e8", borderRadius: 12, overflow: "hidden" }}>
        {rows.length === 0 && (
          <div style={{ padding: "32px", textAlign: "center", color: "#697587", fontSize: 13 }}>記事がありません</div>
        )}
        {rows.map((r, i) => {
          const v = r.metric?.views ?? 0;
          const barPct = Math.round((v / maxViews) * 100);
          const gradeColor = GRADE_COLOR[r.grade] ?? "#9ba8b5";
          return (
            <div key={r.id} style={{ padding: "12px 16px", borderBottom: "1px solid #eef1f5" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#9ba8b5", fontFamily: "monospace", minWidth: 22, textAlign: "right" }}>{i + 1}</span>
                {/* AI評価バッジ */}
                <span style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: gradeColor, color: "#fff", fontWeight: 800, fontSize: 15,
                  display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace",
                }}>{r.grade || "?"}</span>
                <span style={{ background: "#eef2f7", color: "#475569", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700, fontFamily: "monospace", flexShrink: 0 }}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
                <a href={r.link} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: "#161d2b", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</a>
              </div>
              {/* 指標行 */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginLeft: 64, marginTop: 6, fontSize: 11.5, color: "#697587", fontFamily: "monospace", flexWrap: "wrap" }}>
                <span style={{ color: r.metric == null ? "#9ba8b5" : "#0f766b", fontWeight: 700 }}>
                  {r.metric == null ? "PV —" : `${v.toLocaleString()} PV`}
                </span>
                <span>ユーザー {r.metric?.users?.toLocaleString() ?? "—"}</span>
                <span>平均滞在 {r.metric ? fmtSec(r.metric.engagementSec) : "—"}</span>
                {r.reason && <span style={{ color: gradeColor, fontFamily: "inherit" }}>AI: {r.reason}</span>}
              </div>
              {r.metric != null && (
                <div style={{ height: 4, background: "#eef1f5", borderRadius: 2, marginTop: 6, marginLeft: 64, overflow: "hidden" }}>
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
