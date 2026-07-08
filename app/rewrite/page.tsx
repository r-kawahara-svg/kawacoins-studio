import { listWpPosts, type WpPostSummary } from "@/lib/wp";
import { getPageViews, lookupViews } from "@/lib/analytics";
import { db } from "@/db";
import { affiliatePrograms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { RewriteClient } from "./RewriteClient";

export const dynamic = "force-dynamic";

export default async function RewritePage() {
  const currentYear = new Date().getFullYear();

  // 登録済みアフィリ（差し替え用プルダウン）
  const programs = await db.select({ id: affiliatePrograms.id, name: affiliatePrograms.name })
    .from(affiliatePrograms).where(eq(affiliatePrograms.active, true));

  let posts: WpPostSummary[] = [];
  let loadError: string | null = null;
  try {
    posts = await listWpPosts();
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  // GA4 から記事ごとのPVを取得（未設定なら null 表示）
  const pv = await getPageViews(365);
  const viewsMap: Record<number, number | null> = {};
  for (const p of posts) viewsMap[p.id] = lookupViews(pv, p.link, p.id);
  const gaConfigured = pv.configured;
  const gaError = pv.error ?? null;

  return (
    <div style={{ padding: "20px 16px 60px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#697587", fontWeight: 600, fontFamily: "monospace", marginBottom: 16 }}>
        リライト
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#161d2b", margin: "0 0 8px" }}>
        WordPress記事をリライト
      </h1>
      <p style={{ fontSize: 13.5, color: "#697587", margin: "0 0 24px", lineHeight: 1.7 }}>
        WordPressに公開済みの記事を直接読み込みます。対象を選び、最新年への更新や全体の見直しを
        指示して実行すると、WP記事をその場で直接書き換えます（再投稿不要）。
      </p>

      {!gaConfigured && (
        <div style={{ background: "#fffbeb", border: "1px solid #f6c90e", borderRadius: 10, padding: "10px 16px", color: "#92400e", fontSize: 12.5, marginBottom: 16 }}>
          PV表示にはGA4連携が必要です（環境変数 GA4_PROPERTY_ID / GA_SERVICE_ACCOUNT_JSON）。未設定のためPVは「—」表示です。
        </div>
      )}
      {gaConfigured && gaError && (
        <div style={{ background: "#fff5f5", border: "1px solid #feb2b2", borderRadius: 10, padding: "10px 16px", color: "#c4453a", fontSize: 12.5, marginBottom: 16 }}>
          GA4からのPV取得に失敗: {gaError}
        </div>
      )}

      {loadError ? (
        <div style={{ background: "#fff5f5", border: "1px solid #feb2b2", borderRadius: 12, padding: "16px 20px", color: "#c4453a", fontSize: 13.5 }}>
          WordPress記事の読み込みに失敗しました: {loadError}
        </div>
      ) : (
        <RewriteClient posts={posts} currentYear={currentYear} viewsMap={viewsMap} gaConfigured={gaConfigured} programs={programs} />
      )}
    </div>
  );
}
