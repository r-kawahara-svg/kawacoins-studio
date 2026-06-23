import { db } from "@/db";
import { articles, judgments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { marked } from "marked";
import { notFound } from "next/navigation";
import { JudgmentGate } from "./JudgmentGate";
import { publishArticle } from "@/app/actions/articles";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [article] = await db
    .select()
    .from(articles)
    .where(eq(articles.id, id));

  if (!article) notFound();

  const [judgment] = await db
    .select()
    .from(judgments)
    .where(eq(judgments.articleId, id));

  // Render markdown — mark JUDGMENT and AFFILIATE placeholders for highlight
  const markedBody = article.bodyMd
    // Highlight [JUDGMENT:*] in gold
    .replace(
      /\[JUDGMENT:(trade|position|take)\]/g,
      '<span class="judgment-placeholder" data-type="$1">[JUDGMENT:$1]</span>'
    )
    // Highlight [AFFILIATE:*] with teal border
    .replace(
      /\[AFFILIATE:([^\]]+)\]/g,
      '<span class="affiliate-placeholder" data-theme="$1">[AFFILIATE:$1]</span>'
    );

  const bodyHtml = await marked(markedBody);

  const isGateComplete = judgment?.completed === true;

  return (
    <div style={{ padding: "26px 30px 60px", maxWidth: 1100 }}>
      <div
        style={{
          fontSize: 10.5,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#697587",
          fontWeight: 600,
          fontFamily: "monospace",
          marginBottom: 16,
        }}
      >
        記事エディタ — 判断ゲートを完了して公開
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Left: Article preview */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #dce1e8",
            borderRadius: 14,
            padding: "28px 32px",
            boxShadow: "0 1px 2px rgba(22,29,43,.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: "1px solid #dce1e8",
            }}
          >
            <h1
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#161d2b",
                flex: 1,
                margin: 0,
              }}
            >
              {article.title}
            </h1>
            <span
              style={{
                background:
                  article.status === "published"
                    ? "#0f766b"
                    : article.status === "gate"
                    ? "#b07d2e"
                    : "#697587",
                color: "#fff",
                borderRadius: 6,
                padding: "3px 10px",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "monospace",
                flexShrink: 0,
              }}
            >
              {article.status}
            </span>
          </div>

          <style>{`
            .article-body h2 { font-size: 17px; font-weight: 700; color: #161d2b; margin: 24px 0 10px; }
            .article-body h3 { font-size: 15px; font-weight: 600; color: #2b3a52; margin: 18px 0 8px; }
            .article-body p { font-size: 14px; line-height: 1.75; color: #2b3a52; margin: 0 0 12px; }
            .article-body a { color: #0f766b; }
            .judgment-placeholder {
              display: inline-block;
              background: #fef3c7;
              border: 1.5px solid #b07d2e;
              color: #92400e;
              border-radius: 5px;
              padding: 1px 7px;
              font-family: monospace;
              font-size: 12px;
              font-weight: 600;
              margin: 2px 0;
            }
            .affiliate-placeholder {
              display: inline-block;
              background: #f0fdf4;
              border: 1.5px solid #0f766b;
              color: #065f46;
              border-radius: 5px;
              padding: 1px 7px;
              font-family: monospace;
              font-size: 12px;
              font-weight: 600;
              margin: 2px 0;
            }
          `}</style>

          <div
            className="article-body"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </div>

        {/* Right: Judgment gate + publish */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <JudgmentGate
            articleId={id}
            initial={{
              tradeView: judgment?.tradeView ?? null,
              position: judgment?.position ?? null,
              uniqueTake: judgment?.uniqueTake ?? null,
              completed: judgment?.completed ?? null,
            }}
          />

          {/* Publish action */}
          <div
            style={{
              background: "#fff",
              border: "1.5px solid #dce1e8",
              borderRadius: 14,
              padding: "18px 20px",
            }}
          >
            <div
              style={{
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: 13,
                marginBottom: 10,
              }}
            >
              公開設定
            </div>

            {!isGateComplete && (
              <div
                style={{
                  background: "#fef3c7",
                  border: "1px solid #b07d2e",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 12,
                  color: "#92400e",
                  marginBottom: 12,
                }}
              >
                判断ゲートを全て入力してください（{[judgment?.tradeView, judgment?.position, judgment?.uniqueTake].filter(Boolean).length}/3 完了）
              </div>
            )}

            {article.status === "published" ? (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #0f766b",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 12,
                  color: "#065f46",
                }}
              >
                公開済み {article.publishedAt ? `— ${new Date(article.publishedAt).toLocaleDateString("ja-JP")}` : ""}
              </div>
            ) : (
              <form action={publishArticle}>
                <input type="hidden" name="articleId" value={id} />
                <button
                  type="submit"
                  disabled={!isGateComplete}
                  style={{
                    background: isGateComplete ? "#0f766b" : "#dce1e8",
                    color: isGateComplete ? "#fff" : "#697587",
                    border: "none",
                    borderRadius: 9,
                    padding: "9px 20px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isGateComplete ? "pointer" : "not-allowed",
                    width: "100%",
                  }}
                >
                  公開する
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
