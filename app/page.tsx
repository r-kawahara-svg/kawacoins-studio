import { db } from "@/db";
import { topics, articles } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import Link from "next/link";

export default async function DashboardPage() {
  // Real DB counts
  const [topicCount] = await db.select({ count: count() }).from(topics);
  const [gateCount] = await db
    .select({ count: count() })
    .from(articles)
    .where(eq(articles.status, "gate"));
  const [publishedCount] = await db
    .select({ count: count() })
    .from(articles)
    .where(eq(articles.status, "published"));

  // Gate articles list (status = 'gate', most recent 10)
  const gateArticles = await db
    .select({ id: articles.id, title: articles.title, createdAt: articles.createdAt })
    .from(articles)
    .where(eq(articles.status, "gate"))
    .limit(10);

  // Pipeline strip counts
  const [draftCount] = await db
    .select({ count: count() })
    .from(articles)
    .where(eq(articles.status, "draft"));
  const [scheduledCount] = await db
    .select({ count: count() })
    .from(articles)
    .where(eq(articles.status, "scheduled"));

  return (
    <div style={{ padding: "26px 30px 60px", maxWidth: 1000, margin: "0 auto" }}>
      <div
        style={{
          fontSize: 10.5,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#697587",
          fontWeight: 600,
          fontFamily: "monospace",
          marginBottom: 20,
        }}
      >
        ダッシュボード
      </div>

      {/* KPI cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 18,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "ネタ候補",
            value: topicCount.count,
            unit: "件",
            href: "/topics",
            color: "#161d2b",
          },
          {
            label: "判断待ち",
            value: gateCount.count,
            unit: "件",
            color: "#b07d2e",
          },
          {
            label: "公開済み",
            value: publishedCount.count,
            unit: "件",
            color: "#0f766b",
          },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              background: "#fff",
              border: "1px solid #dce1e8",
              borderRadius: 14,
              padding: "18px 20px",
              boxShadow: "0 1px 2px rgba(22,29,43,.04)",
            }}
          >
            <div style={{ fontSize: 12, color: "#697587" }}>{k.label}</div>
            <div
              style={{
                fontFamily: "monospace",
                fontWeight: 800,
                fontSize: 30,
                marginTop: 8,
                color: k.color,
              }}
            >
              {k.value}
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#697587",
                  marginLeft: 2,
                }}
              >
                {k.unit}
              </span>
            </div>
            {k.href && (
              <Link
                href={k.href}
                style={{
                  fontSize: 12,
                  color: "#0f766b",
                  marginTop: 8,
                  display: "block",
                }}
              >
                一覧を見る →
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Pipeline strip */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #dce1e8",
          borderRadius: 14,
          padding: "16px 20px",
          marginBottom: 24,
          display: "flex",
          gap: 0,
          alignItems: "stretch",
          boxShadow: "0 1px 2px rgba(22,29,43,.04)",
        }}
      >
        {[
          {
            label: "ネタキュー",
            count: topicCount.count,
            color: "#697587",
            href: "/topics",
          },
          { arrow: true },
          {
            label: "下書き生成",
            count: draftCount.count,
            color: "#2b5e8c",
          },
          { arrow: true },
          {
            label: "判断ゲート",
            count: gateCount.count,
            color: "#b07d2e",
          },
          { arrow: true },
          {
            label: "スケジュール済み",
            count: scheduledCount.count,
            color: "#7a5ea8",
          },
          { arrow: true },
          {
            label: "公開済み",
            count: publishedCount.count,
            color: "#0f766b",
          },
        ].map((step, i) => {
          if ("arrow" in step) {
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 8px",
                  color: "#dce1e8",
                  fontSize: 18,
                }}
              >
                →
              </div>
            );
          }
          return (
            <div
              key={i}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "8px 4px",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontFamily: "monospace",
                  fontWeight: 800,
                  fontSize: 22,
                  color: step.color,
                }}
              >
                {step.count}
              </div>
              <div style={{ fontSize: 10.5, color: "#697587", marginTop: 2 }}>
                {step.href ? (
                  <Link href={step.href} style={{ color: "#697587" }}>
                    {step.label}
                  </Link>
                ) : (
                  step.label
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gate article list */}
      {gateArticles.length > 0 && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #dce1e8",
            borderRadius: 14,
            marginBottom: 24,
            boxShadow: "0 1px 2px rgba(22,29,43,.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "14px 20px",
              borderBottom: "1px solid #dce1e8",
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              判断待ち記事
            </span>
            <span
              style={{
                marginLeft: "auto",
                background: "#fef3c7",
                color: "#92400e",
                borderRadius: 6,
                padding: "2px 8px",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "monospace",
              }}
            >
              {gateArticles.length}件
            </span>
          </div>
          {gateArticles.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 20px",
                borderBottom: "1px solid #dce1e8",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#b07d2e",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, fontWeight: 500, fontSize: 13, color: "#161d2b" }}>
                {a.title}
              </div>
              {a.createdAt && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#697587",
                    fontFamily: "monospace",
                    flexShrink: 0,
                  }}
                >
                  {new Date(a.createdAt).toLocaleDateString("ja-JP")}
                </div>
              )}
              <Link
                href={`/articles/${a.id}`}
                style={{
                  fontSize: 12,
                  color: "#0f766b",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                判断入力 →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Judgment gate explanation */}
      <div
        style={{
          background: "#161d2b",
          color: "#dfe5ee",
          borderRadius: 14,
          padding: "20px 22px",
          display: "flex",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: "rgba(15,118,107,.25)",
            color: "#5fd3c5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: 20,
          }}
        >
          🛡
        </div>
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "#fff",
              marginBottom: 5,
            }}
          >
            なぜ「判断ゲート」があるのか
          </div>
          <p style={{ fontSize: 12.5, lineHeight: 1.7, color: "#a9b4c4" }}>
            Googleは AI 利用そのものは罰しないが、
            <strong style={{ color: "#fff" }}>
              一次体験と判断の乗らない量産
            </strong>
            を弾く。あなたの実トレード視点を1記事ずつ注入することが、スロップとの唯一の差になる。
          </p>
        </div>
      </div>

      {/* Revenue Phase 2 placeholder */}
      <div
        style={{
          background: "#fff",
          border: "1.5px dashed #dce1e8",
          borderRadius: 14,
          padding: "24px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontWeight: 700,
            fontSize: 13,
            color: "#697587",
            marginBottom: 6,
          }}
        >
          収益ダッシュボード（Phase 2）
        </div>
        <div style={{ fontSize: 12, color: "#a9b4c4" }}>
          AdSense・アフィリエイト収益の集計・グラフはPhase 2で実装予定です
        </div>
      </div>
    </div>
  );
}
