import { db } from "@/db";
import { topics, articles } from "@/db/schema";
import { eq, count, inArray } from "drizzle-orm";
import Link from "next/link";
import { listWpPosts } from "@/lib/wp";
import { getPageMetrics, lookupMetric, getTrafficTrend, getTodayActivity, type TrafficTrend } from "@/lib/analytics";
import { gradeOf, GRADE_STYLE, GRADE_FALLBACK } from "@/lib/grade";
import { analyzeCategories } from "@/lib/categories";

export const dynamic = "force-dynamic";

// 流入トレンドをAIが一言コメント（Haiku）。キー無し/失敗時は定型文。
async function trendComment(t: TrafficTrend): Promise<string> {
  const pct = t.previous.views > 0
    ? Math.round(((t.current.views - t.previous.views) / t.previous.views) * 100)
    : null;
  const fallback = pct == null
    ? "前期間のデータが少なく比較できません。"
    : pct > 5 ? `流入は前期間より約${pct}%増えています。良い傾向です。`
    : pct < -5 ? `流入は前期間より約${Math.abs(pct)}%減っています。テコ入れを検討しましょう。`
    : "流入はほぼ横ばいです。";
  if (!t.configured || !process.env.ANTHROPIC_API_KEY) return fallback;
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `投資ブログの直近${t.days}日とその前${t.days}日のアクセスです。
直近: PV ${t.current.views} / ユーザー ${t.current.users}
前期間: PV ${t.previous.views} / ユーザー ${t.previous.users}

流入が増えているか・横ばいか・減っているかを判定し、次の一手まで含めて2文以内で簡潔にコメント。煽らず事実ベースで。文章のみ返す。`,
      }],
    });
    const text = msg.content.filter(b => b.type === "text").map(b => (b as { text: string }).text).join("").trim();
    return text || fallback;
  } catch {
    return fallback;
  }
}

const CAT_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  未着手: { bg: "#fae3e1", text: "#9c4f47" },
  不足: { bg: "#f8eccf", text: "#8a6d2f" },
  普通: { bg: "#eef0f3", text: "#5b6470" },
  充実: { bg: "#dcebe0", text: "#2f5d3a" },
};

export default async function DashboardPage() {
  const [topicCount] = await db.select({ count: count() }).from(topics).where(eq(topics.status, "new"));
  const [publishedCount] = await db.select({ count: count() }).from(articles).where(eq(articles.status, "published"));
  const [reviewCount] = await db.select({ count: count() }).from(articles).where(inArray(articles.status, ["review", "gate", "approved"]));

  // WP + GA から PV を集計
  let posts: Awaited<ReturnType<typeof listWpPosts>> = [];
  try { posts = await listWpPosts(); } catch { /* WP未設定など */ }
  posts = posts.filter(p => p.status !== "future");
  const pm = await getPageMetrics(365);

  // 最近のサイト状況（直近28日 vs 前28日）＋AIコメント
  const trend = await getTrafficTrend(28);
  const trendPct = trend.previous.views > 0
    ? Math.round(((trend.current.views - trend.previous.views) / trend.previous.views) * 100)
    : null;
  const aiComment = trend.configured && !trend.error ? await trendComment(trend) : "";

  // 今日のサイト状況
  const today = await getTodayActivity();

  const ranked = posts
    .map(p => ({ ...p, metric: lookupMetric(pm, p.link, p.id) }))
    .sort((a, b) => (b.metric?.views ?? -1) - (a.metric?.views ?? -1));

  const totalViews = ranked.reduce((s, r) => s + (r.metric?.views ?? 0), 0);
  const totalUsers = ranked.reduce((s, r) => s + (r.metric?.users ?? 0), 0);
  const top = ranked.slice(0, 5);
  const maxViews = Math.max(1, ...top.map(r => r.metric?.views ?? 0));

  // カテゴリ分析（世の中の投資記事カテゴリ基準との充足度）
  const cats = analyzeCategories(posts.map(p => p.title));
  const gapCount = cats.filter(c => c.status === "未着手").length;
  const lowCount = cats.filter(c => c.status === "不足").length;

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

      {/* 今日のサイト状況 */}
      {today.configured && !today.error && (
        <div style={{ ...card, padding: "16px 20px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>今日のサイト状況</span>
            <span style={{ fontSize: 12, color: "#374151" }}>
              訪問者 <b style={{ color: "#0f766b", fontFamily: "monospace", fontSize: 15 }}>{today.users.toLocaleString()}</b> 人 ・ 閲覧 <b style={{ fontFamily: "monospace" }}>{today.views.toLocaleString()}</b> PV
            </span>
          </div>
          {today.pages.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "#9aa3af" }}>今日はまだアクセスがありません。</div>
          ) : (
            <div>
              <div style={{ fontSize: 11.5, color: "#6b7280", marginBottom: 6 }}>見られたページ</div>
              {today.pages.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderTop: i > 0 ? "1px solid #f2f4f6" : "none" }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
                  <span style={{ fontSize: 12, fontFamily: "monospace", color: "#0f766b", fontWeight: 700, flexShrink: 0 }}>{p.views} PV</span>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "#9aa3af", flexShrink: 0, minWidth: 44, textAlign: "right" }}>{p.users}人</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 10.5, color: "#9aa3af", marginTop: 10, lineHeight: 1.6 }}>
            ※ 自分を除くには、GA4の「内部トラフィックの除外」で自分のIPを登録してください（GA管理画面での設定）。
          </div>
        </div>
      )}

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

      {/* 最近のサイト状況（流入トレンド＋AIコメント） */}
      {trend.configured && !trend.error && (
        <div style={{ ...card, padding: "16px 20px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>最近のサイト状況</span>
            <span style={{ fontSize: 11, color: "#9aa3af", fontFamily: "monospace" }}>直近28日 vs 前28日</span>
            {trendPct != null && (
              <span style={{
                marginLeft: "auto", fontSize: 13, fontWeight: 800, fontFamily: "monospace",
                color: trendPct > 5 ? "#2f7d4f" : trendPct < -5 ? "#b5564e" : "#6b7280",
              }}>
                {trendPct > 0 ? "▲" : trendPct < 0 ? "▼" : "→"} {Math.abs(trendPct)}%
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>PV（直近28日）</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "monospace", color: "#1f2937" }}>
                {trend.current.views.toLocaleString()}
                <span style={{ fontSize: 11, fontWeight: 400, color: "#9aa3af", marginLeft: 6 }}>前: {trend.previous.views.toLocaleString()}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>ユーザー（直近28日）</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "monospace", color: "#1f2937" }}>
                {trend.current.users.toLocaleString()}
                <span style={{ fontSize: 11, fontWeight: 400, color: "#9aa3af", marginLeft: 6 }}>前: {trend.previous.users.toLocaleString()}</span>
              </div>
            </div>
          </div>
          {aiComment && (
            <div style={{ display: "flex", gap: 8, background: "#f1f7f5", border: "1px solid #cfe0dc", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#37494f", lineHeight: 1.7 }}>
              <span style={{ flexShrink: 0 }}>💬</span>
              <span>{aiComment}</span>
            </div>
          )}
        </div>
      )}

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

      {/* カテゴリ分析 */}
      <div style={{ ...card, overflow: "hidden", marginTop: 24 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #eef0f3" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>カテゴリ分析</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, lineHeight: 1.6 }}>
            世の中の投資記事カテゴリと比べた充足度です。
            {(gapCount > 0 || lowCount > 0)
              ? <> <strong style={{ color: "#9c4f47" }}>未着手 {gapCount}</strong> / <strong style={{ color: "#8a6d2f" }}>不足 {lowCount}</strong> — まずここを埋めると網羅性が上がります。</>
              : <> 主要カテゴリは概ねカバーできています。</>}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 0 }}>
          {cats.map((c) => {
            const ss = CAT_STATUS_STYLE[c.status];
            return (
              <div key={c.key} style={{ padding: "12px 18px", borderBottom: "1px solid #eef0f3", borderRight: "1px solid #eef0f3" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{c.label}</span>
                  <span style={{ fontSize: 12, fontFamily: "monospace", color: "#6b7280" }}>{c.count}本</span>
                  <span style={{ background: ss.bg, color: ss.text, borderRadius: 5, padding: "2px 7px", fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>{c.status}</span>
                </div>
                {(c.status === "未着手" || c.status === "不足") && (
                  <div style={{ fontSize: 11, color: "#9aa3af", marginTop: 4, lineHeight: 1.5 }}>{c.why}</div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ padding: "12px 18px", textAlign: "right" }}>
          <Link href="/topics" style={{ fontSize: 12.5, color: "#0f766b", fontWeight: 700, textDecoration: "none" }}>
            不足カテゴリのネタを作る →
          </Link>
        </div>
      </div>
    </div>
  );
}
