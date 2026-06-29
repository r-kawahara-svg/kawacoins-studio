import { db } from "@/db";
import { articles, topics } from "@/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { getTemplate } from "@/lib/templates";
import { RepublishButton } from "./RepublishButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

// 落ち着いたトーンに統一（彩度控えめ）
const TEMPLATE_COLORS: Record<string, string> = {
  T1: "#5f8a8f", T2: "#5b7a9c", T3: "#5f8a6e",
  T4: "#6b6f9c", T5: "#a8736b", T6: "#5b7a9c",
};

export default async function PublishedPage() {
  const publishedArticles = await db
    .select()
    .from(articles)
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.publishedAt));

  const topicIds = publishedArticles.map(a => a.topicId).filter(Boolean) as string[];
  const topicsMap: Record<string, string> = {};
  if (topicIds.length > 0) {
    const topicRows = await db.select({ id: topics.id, keyword: topics.keyword })
      .from(topics).where(inArray(topics.id, topicIds));
    for (const t of topicRows) topicsMap[t.id] = t.keyword ?? "";
  }

  return (
    <div style={{ padding: "20px 16px 60px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#697587", fontWeight: 600, fontFamily: "monospace", marginBottom: 16 }}>
        公開済み記事
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#161d2b", margin: "0 0 24px" }}>
        公開済み ({publishedArticles.length}件)
      </h1>

      {publishedArticles.length === 0 ? (
        <div style={{ background: "#f8faf9", border: "1px solid #dce1e8", borderRadius: 12, padding: "28px 24px", textAlign: "center", color: "#697587", fontSize: 14 }}>
          まだ公開済み記事はありません
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {publishedArticles.map(article => {
            const tmpl = getTemplate(article.template);
            const keyword = article.topicId ? topicsMap[article.topicId] : "";
            const tcolor = TEMPLATE_COLORS[article.template ?? ""] ?? "#697587";
            return (
              <div key={article.id} style={{
                background: "#fff", border: "1px solid #dce1e8", borderRadius: 12,
                padding: "16px 20px", boxShadow: "0 1px 2px rgba(22,29,43,.04)",
                display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
              }}>
                {/* テンプレバッジ */}
                {article.template && (
                  <span style={{
                    background: tcolor, color: "#fff", borderRadius: 6,
                    padding: "2px 9px", fontSize: 11, fontWeight: 700,
                    fontFamily: "monospace", flexShrink: 0,
                  }}>
                    {article.template}
                  </span>
                )}

                {/* タイトル・メタ */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#161d2b", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {article.title}
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    {keyword && (
                      <span style={{ fontSize: 11, color: "#697587" }}>{keyword}</span>
                    )}
                    {article.publishedAt && (
                      <span style={{ fontSize: 11, color: "#9ba8b5", fontFamily: "monospace" }}>
                        {new Date(article.publishedAt).toLocaleDateString("ja-JP")}
                      </span>
                    )}
                    {article.wpPostId && (
                      <span style={{ fontSize: 11, color: "#0f766b", fontFamily: "monospace", fontWeight: 600 }}>
                        WP #{article.wpPostId}
                      </span>
                    )}
                    {!article.wpPostId && (
                      <span style={{ fontSize: 11, color: "#b07d2e", fontFamily: "monospace" }}>WP未連携</span>
                    )}
                  </div>
                </div>

                {/* アクション */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  <Link
                    href={`/articles/${article.id}`}
                    style={{
                      fontSize: 12, color: "#697587", fontWeight: 600,
                      border: "1px solid #dce1e8", borderRadius: 7,
                      padding: "6px 12px", textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    記事を見る
                  </Link>
                  <RepublishButton articleId={article.id} wpPostId={article.wpPostId} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
