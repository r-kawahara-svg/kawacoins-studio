import { db } from "@/db";
import { topics, articles } from "@/db/schema";
import { eq, count, inArray } from "drizzle-orm";
import Link from "next/link";
import { listWpPosts } from "@/lib/wp";
import { getPageMetrics, lookupMetric } from "@/lib/analytics";
import { gradeOf, GRADE_STYLE, GRADE_FALLBACK } from "@/lib/grade";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [topicCount] = await db.select({ count: count() }).from(topics).where(eq(topics.status, "new"));
  const [publishedCount] = await db.select({ count: count() }).from(articles).where(eq(articles.status, "published"));
  const [reviewCount] = await db.select({ count: count() }).from(articles).where(inArray(articles.status, ["review", "gate", "approved"]));

  // WP + GA から PV を集計
  let posts: Awaited<ReturnType<typeof listWpPosts>> = [];
  try { posts = await listWpPosts(); } catch { /* WP未設定など */ }
  posts = posts.filter(p => p.status !== "future");
  const pm = await getPageMetrics(365);

  const ranked = posts
    .map(p => ({ ...p, metric: lookupMetric(pm, p.link, p.id) }))
    .sort((a, b) => (b.metric?.views ?? -1) - (a.metric?.views ?? -1));

  const totalViews = ranked.reduce((s, r) => s + (r.metric?.views ?? 0), 0);
  const totalUsers = ranked.reduce((s, r) => s + (r.metric?.users ?? 0), 0);
  const top = ranked.slice(0, 5);
  const maxViews = Math.max(1, ...top.map(r => r.metric?.views ?? 0));

  const metrics = [
    { label: "合計PV（365日）", value: pm.configured ? totalViews.toLocaleString() : "—", accent: true },
    { label: "合計ユーザー", value: pm.configured ? totalUsers.toLocaleString() : "—" },
    { label: "公開記事", value: publishedCount.count.toLocaleString() },
    { label: "ネタ候補", value: topicCount.count.toLocaleString() },
  ];

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e3e6ea", borderRadius: 14 };

  return (
    <div style={{ padding: "20px 16px 60px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9aa3af", fontWeight: 600, fontFamily: "monospace", marginBottom: 12 }}>
        ダッシュボード
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1f2937", margin: "0 0 20px" }}>
        記事スタジオの状況
      </h1>

      {/* メトリクスカード（レスポンシブ） */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
        {metrics.map((m) => (
          <div key={m.label} style={{ ...card, padding: "16px 18px" }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{m.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "monospace", marginTop: 6, color: m.accent ? "#0f766b" : "#1f2937" }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* やること */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 24 }}>
        <Link href="/topics" style={{ ...card, padding: "16px 18px", textDecoration: "none", display: "block" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>新しい記事を作る</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>ネタ生成 → 公開まで</div>
            </div>
            <span style={{ fontSize: 13, color: "#0f766b", fontWeight: 700 }}>ネタ候補 {topicCount.count} →</span>
          </div>
        </Link>
        <Link href="/rewrite" style={{ ...card, padding: "16px 18px", textDecoration: "none", display: "block" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>公開記事をリライト</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>更新・見直し・アイキャッチ再生成</div>
            </div>
            <span style={{ fontSize: 13, color: "#0f766b", fontWeight: 700 }}>→</span>
          </div>
        </Link>
      </div>

      {/* 人気記事 TOP5 */}
      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #eef0f3" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>よく読まれている記事</span>
          <Link href="/analytics" style={{ marginLeft: "auto", fontSize: 12, color: "#0f766b", fontWeight: 600, textDecoration: "none" }}>
            アクセス解析へ →
          </Link>
        </div>

        {!pm.configured && (
          <div style={{ padding: "20px 18px", fontSize: 12.5, color: "#8a6d2f", background: "#fbf6e9" }}>
            PVを表示するにはGoogle Analytics（GA4）の連携設定が必要です。
          </div>
        )}

        {pm.configured && top.length === 0 && (
          <div style={{ padding: "24px 18px", textAlign: "center", color: "#6b7280", fontSize: 13 }}>まだ記事がありません</div>
        )}

        {top.map((r, i) => {
          const v = r.metric?.views ?? 0;
          const barPct = Math.round((v / maxViews) * 100);
          const grade = gradeOf(r.metric);
          const gs = GRADE_STYLE[grade] ?? GRADE_FALLBACK;
          return (
            <div key={r.id} style={{ padding: "12px 18px", borderBottom: "1px solid #eef0f3" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#aab0b8", fontFamily: "monospace", minWidth: 18 }}>{i + 1}</span>
                <span style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: gs.bg, color: gs.text, fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>
                  {grade || "—"}
                </span>
                <a href={r.link} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: "#1f2937", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</a>
                <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: "monospace", flexShrink: 0, color: r.metric == null ? "#aab0b8" : "#374151" }}>
                  {r.metric == null ? "—" : `${v.toLocaleString()} PV`}
                </span>
              </div>
              {r.metric != null && (
                <div style={{ height: 4, background: "#eef0f3", borderRadius: 2, marginTop: 6, marginLeft: 54, overflow: "hidden" }}>
                  <div style={{ width: `${barPct}%`, height: "100%", background: gs.bar }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
