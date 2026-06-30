import { db } from "@/db";
import { topics } from "@/db/schema";
import { desc } from "drizzle-orm";
import { addTopic } from "@/app/actions/topics";
import { GenerateButton } from "./GenerateButton";
import { SuggestPanel } from "./SuggestPanel";
import { FailureStoryForm } from "./FailureStoryForm";

const SOURCE_LABELS: Record<string, { label: string; bg: string }> = {
  earnings: { label: "決算", bg: "#2b5e8c" },
  news:     { label: "ニュース", bg: "#7a5ea8" },
  market:   { label: "市況", bg: "#0f766b" },
  idea:     { label: "解説", bg: "#b07d2e" },
};

const COMPETITION_LABELS: Record<string, string> = {
  low: "競合: 薄",
  mid: "競合: 中",
  high: "競合: 厚",
};

function ScoreBars({ score }: { score: number }) {
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 20 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ width: 5, height: 4 + i * 4, borderRadius: 2, background: i <= score ? "#b07d2e" : "#dce1e8" }} />
      ))}
    </div>
  );
}

export default async function TopicsPage() {
  const rows = await db.select().from(topics).orderBy(desc(topics.createdAt));

  return (
    <div style={{ padding: "20px 16px 60px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#697587", fontWeight: 600, fontFamily: "monospace", marginBottom: 16 }}>
        ネタキュー — 手動でネタを追加して下書き生成へ
      </div>

      {/* AI ネタ提案 */}
      <SuggestPanel />

      {/* 失敗談の生データ入力 → T5生成 */}
      <FailureStoryForm />

      {/* 追加フォーム */}
      <div style={{ background: "#fff", border: "1px solid #dce1e8", borderRadius: 14, marginBottom: 20, padding: "20px 24px", boxShadow: "0 1px 2px rgba(22,29,43,.04)" }}>
        <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14, marginBottom: 16 }}>新規ネタを追加</div>
        <form action={addTopic}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <Label>タイトル *</Label>
              <Input name="title" placeholder="例: 藤倉電線 1Q決算レポート" required />
            </div>
            <div>
              <Label>ソース種別</Label>
              <Select name="source">
                <option value="earnings">決算</option>
                <option value="news">ニュース</option>
                <option value="market">市況</option>
                <option value="idea">解説/アイデア</option>
              </Select>
            </div>
            <div>
              <Label>競合</Label>
              <Select name="competition" defaultValue="mid">
                <option value="low">薄い</option>
                <option value="mid">中程度</option>
                <option value="high">厚い</option>
              </Select>
            </div>
            <div>
              <Label>収益性スコア（1-5）</Label>
              <Select name="revenue_score" defaultValue="3">
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </Select>
            </div>
            <div>
              <Label>想定キーワード</Label>
              <Input name="keyword" placeholder="例: 藤倉電線 決算" />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <Label>概要メモ</Label>
              <textarea name="summary" placeholder="簡単なメモ" style={inputStyle} rows={2} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <Label>出典URL</Label>
              <Input name="source_url" placeholder="https://..." type="url" />
            </div>
          </div>
          <button type="submit" style={{ marginTop: 16, background: "#0f766b", color: "#fff", border: "none", borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            追加する
          </button>
        </form>
      </div>

      {/* 一覧 */}
      <div style={{ background: "#fff", border: "1px solid #dce1e8", borderRadius: 14, boxShadow: "0 1px 2px rgba(22,29,43,.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid #dce1e8" }}>
          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14 }}>ネタ候補キュー</span>
          <span style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: 11, color: "#697587" }}>{rows.length}件</span>
        </div>

        {rows.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#697587", fontSize: 13 }}>
            まだネタがありません。上のフォームから追加してください。
          </div>
        )}

        {rows.map(t => {
          const src = SOURCE_LABELS[t.source] ?? { label: t.source, bg: "#697587" };
          return (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: "1px solid #dce1e8" }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: src.bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "monospace", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                {src.label}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{t.title}</div>
                <div style={{ fontSize: 11.5, color: "#697587", marginTop: 3, display: "flex", gap: 10, fontFamily: "monospace", flexWrap: "wrap" }}>
                  {t.keyword && <span>「{t.keyword}」</span>}
                  <span>{COMPETITION_LABELS[t.competition ?? "mid"]}</span>
                  {t.summary && <span style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.summary}</span>}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                <ScoreBars score={t.revenueScore ?? 3} />
                <span style={{ fontSize: 10, color: "#697587", fontFamily: "monospace" }}>収益性 {t.revenueScore}/5</span>
              </div>
              <GenerateButton topicId={t.id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", border: "1px solid #dce1e8", borderRadius: 9, padding: "10px 12px", fontSize: 16, color: "#161d2b", background: "#fff", fontFamily: "inherit" };

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: "#697587", marginBottom: 4 }}>{children}</div>;
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={inputStyle} />;
}
function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return <select {...props} style={inputStyle}>{children}</select>;
}
