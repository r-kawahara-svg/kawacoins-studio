import { db } from "@/db";
import { articles, judgments, experiences as experiencesTable, affiliatePrograms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { marked } from "marked";
import { notFound } from "next/navigation";
import { JudgmentGate } from "./JudgmentGate";
import { ExperienceForm } from "@/app/review/ExperienceForm";
import { publishArticle, setArticleAffiliate } from "@/app/actions/articles";
import { DeleteButton } from "./DeleteButton";
import { RewriteButton } from "@/app/review/RewriteButton";
import { PublishButton } from "@/app/review/PublishButton";
import { XPostBox } from "./XPostBox";
import { isJudgmentComplete } from "@/lib/gate";
import { getTemplate } from "@/lib/templates";

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

  const tmpl = getTemplate(article.template);
  const isTemplateArticle = !!tmpl;

  // テンプレート記事: experience スロットを取得
  const expRows = isTemplateArticle
    ? await db.select().from(experiencesTable).where(eq(experiencesTable.articleId, id))
    : [];
  const slots = tmpl?.experienceSlots ?? [];
  const expFilledCount = expRows.filter((e) => e.completed).length;
  const isExpReady = slots.length === 0 || expFilledCount >= slots.length;

  // 非テンプレート記事: judgment ゲート
  const [judgment] = isTemplateArticle
    ? [undefined]
    : await db.select().from(judgments).where(eq(judgments.articleId, id));

  // 充足判定: フィールド値を直接参照（completed フラグは副産物なので信用しない）
  const isGateComplete = !isTemplateArticle && judgment ? isJudgmentComplete(judgment) : false;

  // この記事に入る広告（アフィリ）を解決
  const affPrograms = await db.select({ id: affiliatePrograms.id, name: affiliatePrograms.name, themes: affiliatePrograms.themes })
    .from(affiliatePrograms).where(eq(affiliatePrograms.active, true));
  const affKey = article.bodyMd.match(/\[AFFILIATE:([^\]]+)\]/)?.[1]?.trim() ?? null;
  let currentAffId = "";
  let currentAffLabel = "未設定（広告なし）";
  if (affKey) {
    if (affKey.startsWith("id:")) {
      const pid = affKey.slice(3).trim();
      const p = affPrograms.find(x => x.id === pid);
      currentAffId = pid;
      currentAffLabel = p ? p.name : "（削除された広告）";
    } else {
      const p = affPrograms.find(x => ((x.themes as string[]) ?? []).includes(affKey));
      currentAffId = p?.id ?? "";
      currentAffLabel = p ? `${p.name}（テーマ:${affKey}）` : `テーマ「${affKey}」に該当する広告なし`;
    }
  }

  // Render markdown
  const markedBody = article.bodyMd
    .replace(
      /\[JUDGMENT:(trade|position|take)\]/g,
      '<span class="judgment-placeholder" data-type="$1">[JUDGMENT:$1]</span>'
    )
    .replace(
      /\[AFFILIATE:([^\]]+)\]/g,
      '<span class="affiliate-placeholder" data-theme="$1">[AFFILIATE:$1]</span>'
    );

  const bodyHtml = await marked(markedBody);

  const breadcrumb = isTemplateArticle
    ? `記事エディタ — ${tmpl!.name} (${article.template})`
    : "記事エディタ — 判断ゲートを完了して公開";

  return (
    <div style={{ padding: "20px 16px 60px", maxWidth: 1100, margin: "0 auto" }}>
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
        {breadcrumb}
      </div>

      <div className="article-grid" style={{ display: "grid", gap: 24, alignItems: "start" }}>
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
                    : article.status === "approved"
                    ? "#0f766b"
                    : article.status === "gate" || article.status === "review"
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
            <RewriteButton articleId={id} currentTemplate={article.template} />
            <DeleteButton articleId={id} hasWpPost={!!article.wpPostId} compact />
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

        {/* Right: gate + publish */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isTemplateArticle ? (
            /* テンプレート記事: ExperienceForm を使う */
            slots.length > 0 ? (
              <ExperienceForm
                articleId={id}
                slots={slots}
                initial={expRows.map((e) => ({
                  id: e.id,
                  label: e.label,
                  choice: e.choice,
                  note: e.note,
                  completed: e.completed,
                }))}
                template={article.template}
                articleStatus={article.status}
              />
            ) : (
              <div style={{ background: "#f0fdf4", border: "1px solid #0f766b", borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "#065f46" }}>
                このテンプレートは体験入力スロットなし
              </div>
            )
          ) : (
            /* 非テンプレート記事: JudgmentGate */
            <JudgmentGate
              articleId={id}
              initial={{
                tradeView: judgment?.tradeView ?? null,
                position: judgment?.position ?? null,
                uniqueTake: judgment?.uniqueTake ?? null,
                completed: judgment?.completed ?? null,
              }}
            />
          )}

          {/* 公開設定 */}
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
            ) : isTemplateArticle ? (
              /* テンプレート記事: 体験入力→承認→公開（体験スロット無しは直接投稿可） */
              (article.status === "approved" || slots.length === 0) ? (
                <PublishButton articleId={id} />
              ) : (
                <div>
                  {!isExpReady && (
                    <div
                      style={{
                        background: "#fef3c7",
                        border: "1px solid #b07d2e",
                        borderRadius: 8,
                        padding: "8px 12px",
                        fontSize: 12,
                        color: "#92400e",
                        marginBottom: 8,
                      }}
                    >
                      体験スロットを入力・保存し、承認してください（{expFilledCount}/{slots.length} 完了）
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "#697587" }}>
                    右側フォームで体験入力→承認後に投稿できます
                  </div>
                </div>
              )
            ) : (
              /* 非テンプレート記事: 判断ゲート→公開 */
              <>
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
                    判断ゲートを全て入力して保存してください（{[judgment?.tradeView, judgment?.position, judgment?.uniqueTake].filter(Boolean).length}/3 完了）
                  </div>
                )}
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
              </>
            )}
          </div>

          {/* この記事に入る広告（アフィリ）— 表示・変更 */}
          <div style={{ background: "#fff", border: "1px solid #e3e6ea", borderRadius: 12, padding: "14px 16px", marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", marginBottom: 6 }}>この記事に入る広告</div>
            <div style={{ fontSize: 12.5, color: currentAffId ? "#0f766b" : "#b0752e", background: currentAffId ? "#f1f7f5" : "#fbf6e9", border: `1px solid ${currentAffId ? "#cfe0dc" : "#ecdcb0"}`, borderRadius: 8, padding: "8px 11px", marginBottom: 10, lineHeight: 1.5 }}>
              {currentAffLabel}
            </div>
            <form action={setArticleAffiliate} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input type="hidden" name="articleId" value={id} />
              <select name="programId" defaultValue={currentAffId} required
                style={{ flex: 1, minWidth: 150, border: "1px solid #dce1e8", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: "#1f2937", background: "#fff" }}>
                <option value="" disabled>広告を選ぶ…</option>
                {affPrograms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button type="submit" style={{ background: "#0f766b", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                この広告にする
              </button>
            </form>
            <div style={{ fontSize: 11, color: "#9aa3af", marginTop: 8, lineHeight: 1.5 }}>
              選んだ広告が公開時に本文へ入ります。違う場合はここで変更してください。
            </div>
          </div>

          {/* X投稿文（コピペ用） */}
          <XPostBox articleId={id} />
        </div>
      </div>
    </div>
  );
}
