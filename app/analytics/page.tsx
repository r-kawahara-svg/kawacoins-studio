import { listWpPosts, type WpPostSummary } from "@/lib/wp";
import { getPageViews, lookupViews } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  publish: "公開", draft: "下書き", future: "予約", pending: "承認待ち", private: "非公開",
};

export default async function AnalyticsPage() {
  let posts: WpPostSummary[] = [];
  let loadError: string | null = null;
  try {
    posts = await listWpPosts();
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  const pv = await getPageViews(365);

  // 記事ごとのPVを引いて、PV降順に並べる
  const rows = posts
    .map((p) => ({ ...p, views: lookupViews(pv, p.link, p.id) }))
    .sort((a, b) => (b.views ?? -1) - (a.views ?? -1));

  const totalViews = rows.reduce((s, r) => s + (r.views ?? 0), 0);
  const maxViews = Math.max(1, ...rows.map((r) => r.views ?? 0));

  return (
    <div style={{ padding: "20px 16px 60px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#697587", fontWeight: 600, fontFamily: "monospace", marginBottom: 16 }}>
        アクセス解析
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#161d2b", margin: "0 0 4px" }}>
        ページの閲覧数（PV）
      </h1>
      <p style={{ fontSize: 13, color: "#697587", margin: "0 0 20px" }}>
        Google Analytics の直近365日のデータ。よく見られている記事順に並んでいます。
      </p>

      {/* 合計カード */}
      {pv.configured && !pv.error && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <div style={{ background: "#0f766b", color: "#fff", borderRadius: 12, padding: "16px 22px", minWidth: 180 }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>合計PV（直近365日）</div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "monospace", marginTop: 4 }}>{totalViews.toLocaleString()}</div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #dce1e8", borderRadius: 12, padding: "16px 22px", minWidth: 140 }}>
            <div style={{ fontSize: 12, color: "#697587" }}>記事数</div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "monospace", marginTop: 4, color: "#161d2b" }}>{rows.length}</div>
          </div>
        </div>
      )}

      {!pv.configured && (
        <div style={{ background: "#fffbeb", border: "1px solid #f6c90e", borderRadius: 10, padding: "12px 16px", color: "#92400e", fontSize: 13, marginBottom: 16 }}>
          PVを表示するにはGoogle Analytics（GA4）の連携設定が必要です。
        </div>
      )}
      {pv.configured && pv.error && (
        <div style={{ background: "#fff5f5", border: "1px solid #feb2b2", borderRadius: 10, padding: "12px 16px", color: "#c4453a", fontSize: 13, marginBottom: 16 }}>
          GA4からのPV取得に失敗しました: {pv.error}
        </div>
      )}
      {loadError && (
        <div style={{ background: "#fff5f5", border: "1px solid #feb2b2", borderRadius: 10, padding: "12px 16px", color: "#c4453a", fontSize: 13, marginBottom: 16 }}>
          WordPress記事の読み込みに失敗: {loadError}
        </div>
      )}

      {/* 記事一覧（PV順） */}
      <div style={{ background: "#fff", border: "1px solid #dce1e8", borderRadius: 12, overflow: "hidden" }}>
        {rows.length === 0 && (
          <div style={{ padding: "32px", textAlign: "center", color: "#697587", fontSize: 13 }}>記事がありません</div>
        )}
        {rows.map((r, i) => {
          const v = r.views ?? 0;
          const barPct = Math.round((v / maxViews) * 100);
          return (
            <a key={r.id} href={r.link} target="_blank" rel="noopener noreferrer" style={{
              display: "block", padding: "12px 16px", borderBottom: "1px solid #eef1f5", textDecoration: "none", color: "inherit",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#9ba8b5", fontFamily: "monospace", minWidth: 26, textAlign: "right" }}>{i + 1}</span>
                <span style={{ background: "#eef2f7", color: "#475569", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700, fontFamily: "monospace", flexShrink: 0 }}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: "#161d2b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
                <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "monospace", flexShrink: 0, minWidth: 80, textAlign: "right", color: r.views == null ? "#9ba8b5" : "#0f766b" }}>
                  {r.views == null ? "—" : `${v.toLocaleString()}`}
                  {r.views != null && <span style={{ fontSize: 10, fontWeight: 400, color: "#9ba8b5", marginLeft: 3 }}>PV</span>}
                </span>
              </div>
              {r.views != null && (
                <div style={{ height: 4, background: "#eef1f5", borderRadius: 2, marginTop: 8, marginLeft: 38, overflow: "hidden" }}>
                  <div style={{ width: `${barPct}%`, height: "100%", background: "#0f766b" }} />
                </div>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
