import { listWpPosts, type WpPostSummary } from "@/lib/wp";
import { RewriteClient } from "./RewriteClient";

export const dynamic = "force-dynamic";

export default async function RewritePage() {
  const currentYear = new Date().getFullYear();

  let posts: WpPostSummary[] = [];
  let loadError: string | null = null;
  try {
    posts = await listWpPosts();
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

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

      {loadError ? (
        <div style={{ background: "#fff5f5", border: "1px solid #feb2b2", borderRadius: 12, padding: "16px 20px", color: "#c4453a", fontSize: 13.5 }}>
          WordPress記事の読み込みに失敗しました: {loadError}
        </div>
      ) : (
        <RewriteClient posts={posts} currentYear={currentYear} />
      )}
    </div>
  );
}
