import { db } from "@/db";
import { articles, topics, experiences } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getTemplate } from "@/lib/templates";
import { ExperienceForm } from "./ExperienceForm";
import { RewriteButton } from "./RewriteButton";
import { RejectButton } from "./RejectButton";
import { publishArticle } from "@/app/actions/articles";
import { DeleteButton } from "@/app/articles/[id]/DeleteButton";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const reviewArticles = await db
    .select()
    .from(articles)
    .where(inArray(articles.status, ["review", "approved"]))
    .orderBy(articles.createdAt);

  // 対応 topic を取得（タイトル補足用）
  const topicIds = reviewArticles.map((a) => a.topicId).filter(Boolean) as string[];
  const topicsMap: Record<string, string> = {};
  if (topicIds.length > 0) {
    const topicRows = await db.select({ id: topics.id, keyword: topics.keyword }).from(topics).where(inArray(topics.id, topicIds));
    for (const t of topicRows) topicsMap[t.id] = t.keyword ?? "";
  }

  // 各記事の体験入力を取得
  const articleIds = reviewArticles.map((a) => a.id);
  const allExps = articleIds.length > 0
    ? await db.select().from(experiences).where(inArray(experiences.articleId, articleIds))
    : [];

  const expsByArticle: Record<string, typeof allExps> = {};
  for (const e of allExps) {
    if (!expsByArticle[e.articleId]) expsByArticle[e.articleId] = [];
    expsByArticle[e.articleId].push(e);
  }

  return (
    <div style={{ padding: "20px 16px 60px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#697587", fontWeight: 600, fontFamily: "monospace", marginBottom: 16 }}>
        承認レビュー — 体験入力 &amp; 承認
      </div>

      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#161d2b", margin: "0 0 24px" }}>
        レビュー待ち ({reviewArticles.length}件)
      </h1>

      {reviewArticles.length === 0 && (
        <div style={{ background: "#f8faf9", border: "1px solid #dce1e8", borderRadius: 12, padding: "28px 24px", textAlign: "center", color: "#697587", fontSize: 14 }}>
          レビュー待ちの記事はありません
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {reviewArticles.map((article) => {
          const tmpl = getTemplate(article.template);
          const slots = tmpl?.experienceSlots ?? [];
          const exps = expsByArticle[article.id] ?? [];
          const filledCount = exps.filter((e) => e.completed).length;
          const isReady = slots.length === 0 || filledCount >= slots.length;
          const statusColor = article.status === "approved" ? "#0f766b" : "#b07d2e";

          return (
            <div
              key={article.id}
              style={{ background: "#fff", border: "1.5px solid #dce1e8", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 2px rgba(22,29,43,.04)" }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid #dce1e8" }}>
                <div style={{ flex: 1 }}>
                  <a href={`/articles/${article.id}`} style={{ fontSize: 15, fontWeight: 700, color: "#161d2b", textDecoration: "none" }}>
                    {article.title}
                  </a>
                  <div style={{ fontSize: 12, color: "#697587", marginTop: 4 }}>
                    {article.template && <span style={{ background: "#f0fdf4", border: "1px solid #0f766b", color: "#065f46", borderRadius: 4, padding: "1px 7px", fontSize: 11, fontWeight: 600, marginRight: 6 }}>{article.template}: {tmpl?.name}</span>}
                    <span>図表 {(article.visuals as unknown[])?.length ?? 0}件</span>
                    {" · "}
                    <span>FAQ {(article.faq as unknown[])?.length ?? 0}件</span>
                    {slots.length > 0 && (
                      <>
                        {" · "}
                        <span style={{ color: isReady ? "#0f766b" : "#b07d2e", fontWeight: 600 }}>
                          体験 {filledCount}/{slots.length} {isReady ? "✓" : "未充足"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span style={{ background: statusColor, color: "#fff", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, fontFamily: "monospace", flexShrink: 0 }}>
                  {article.status}
                </span>
              </div>

              {/* Main layout */}
              <div className={slots.length > 0 ? "review-grid-2col" : ""} style={{ display: "grid", gap: 20, alignItems: "start" }}>
                {/* Article preview excerpt */}
                <div style={{ fontSize: 13, color: "#2b3a52", lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 200, overflow: "hidden", position: "relative" }}>
                  {article.bodyMd.slice(0, 500)}{article.bodyMd.length > 500 ? "…" : ""}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 40, background: "linear-gradient(to bottom, transparent, #fff)" }} />
                </div>

                {/* Experience form */}
                {slots.length > 0 && (
                  <ExperienceForm
                    articleId={article.id}
                    slots={slots}
                    initial={exps.map((e) => ({ id: e.id, label: e.label, choice: e.choice, note: e.note, completed: e.completed }))}
                    template={article.template}
                  />
                )}
              </div>

              {/* Action bar */}
              <div style={{ display: "flex", gap: 10, marginTop: 16, paddingTop: 14, borderTop: "1px solid #dce1e8", alignItems: "center" }}>
                {article.status === "approved" ? (
                  <form action={publishArticle}>
                    <input type="hidden" name="articleId" value={article.id} />
                    <button
                      type="submit"
                      style={{ background: "#0f766b", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      WPに投稿する
                    </button>
                  </form>
                ) : (
                  <div style={{ fontSize: 12, color: "#697587" }}>
                    体験入力を保存・承認後に投稿できます
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
                  <RewriteButton articleId={article.id} currentTemplate={article.template} />
                  <DeleteButton articleId={article.id} hasWpPost={!!article.wpPostId} compact />
                  <RejectButton articleId={article.id} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
