import { db } from "@/db";
import { articles } from "@/db/schema";
import { desc } from "drizzle-orm";
import { RewriteClient } from "./RewriteClient";

export const dynamic = "force-dynamic";

export default async function RewritePage() {
  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      template: articles.template,
      status: articles.status,
      wpPostId: articles.wpPostId,
    })
    .from(articles)
    .orderBy(desc(articles.createdAt));

  const currentYear = new Date().getFullYear();

  return (
    <div style={{ padding: "20px 16px 60px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#697587", fontWeight: 600, fontFamily: "monospace", marginBottom: 16 }}>
        リライト
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#161d2b", margin: "0 0 8px" }}>
        記事をまとめてリライト
      </h1>
      <p style={{ fontSize: 13.5, color: "#697587", margin: "0 0 24px", lineHeight: 1.7 }}>
        既存記事を読み込み、最新年への更新や最新の装飾（会話吹き出し・考察）の適用を一括で行えます。
        対象を選び、指示を確認して実行してください。
      </p>

      <RewriteClient articles={rows} currentYear={currentYear} />
    </div>
  );
}
