"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ArticleRow {
  id: string;
  title: string;
  template: string | null;
  status: string;
  wpPostId: number | null;
}

type RunState = "idle" | "running" | "done" | "error";

const TEMPLATE_COLORS: Record<string, string> = {
  T1: "#1a9a82", T2: "#2264cc", T3: "#207840",
  T4: "#3d4fb8", T5: "#b83030", T6: "#2b5c8c",
};

export function RewriteClient({ articles, currentYear }: { articles: ArticleRow[]; currentYear: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [direction, setDirection] = useState(
    `本文の年号・情報を${currentYear}年の最新版に更新する。古い年号や「今年」表現は全て${currentYear}年に直す。\n` +
    `会話吹き出し（読者の疑問→筆者の回答）と「考察」ボックスなど最新の装飾を適切に盛り込み、読みやすくする。`
  );
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, RunState>>({});
  const [current, setCurrent] = useState<string | null>(null);

  const PRESETS: { label: string; text: string }[] = [
    {
      label: `📅 最新年(${currentYear})に更新`,
      text: `本文の年号・情報を${currentYear}年の最新版に更新する。古い年号や「今年」「最新」表現は全て${currentYear}年基準に直す。未確定の制度は「予定」「審議中」と明記する。`,
    },
    {
      label: "✨ 最新の装飾を適用",
      text: `会話吹き出し（[TALK:reader]→[TALK:author]）を2〜3ペア、難しい箇所の前に入れる。説明型の記事なら「考察」([INSIGHT])で実践的な独自視点を加える。読みやすく段落を整える。`,
    },
    {
      label: "🔍 全体を見直して整える",
      text: `記事全体を読み直し、不自然・分かりにくい箇所を書き直す。具体的には:\n` +
        `・走り書きのような不自然なコメント（例「安いので！」）を、理由や文脈を補って自然な文章にする\n` +
        `・回りくどい/冗長な文、唐突な言い回し、意味の通らない箇所を直す\n` +
        `・本文とFAQ・吹き出しの内容やトーンの食い違いを揃える\n` +
        `・事実や数値は変えず、表現と読みやすさだけを改善する`,
    },
    {
      label: "🔁 全部入り更新",
      text: `本文を${currentYear}年の最新情報に更新（古い年号は直す・未確定は「予定」と明記）。\n会話吹き出しと「考察」など最新の装飾を盛り込み、CTA直前ではデメリットを紹介サービスがどう解消するかを1文で結びつける。\n全体を読み直して不自然な箇所（走り書きのようなコメント等）も自然に書き直し、読みやすく整える。`,
    },
  ];

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => prev.size === articles.length ? new Set() : new Set(articles.map(a => a.id)));
  }

  async function run() {
    if (selected.size === 0 || !direction.trim()) return;
    setRunning(true);
    const ids = articles.filter(a => selected.has(a.id)).map(a => a.id);
    for (const id of ids) {
      setCurrent(id);
      setResults((r) => ({ ...r, [id]: "running" }));
      try {
        const res = await fetch(`/api/articles/${id}/rewrite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction }),
        });
        setResults((r) => ({ ...r, [id]: res.ok ? "done" : "error" }));
      } catch {
        setResults((r) => ({ ...r, [id]: "error" }));
      }
    }
    setCurrent(null);
    setRunning(false);
    router.refresh();
  }

  const doneCount = Object.values(results).filter(s => s === "done").length;

  return (
    <div>
      {/* 指示プリセット */}
      <div style={{ background: "#fff", border: "1px solid #dce1e8", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#161d2b", marginBottom: 10 }}>リライト指示</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {PRESETS.map((p) => (
            <button key={p.label} onClick={() => setDirection(p.text)} disabled={running} style={{
              background: "#f0fdf4", color: "#065f46", border: "1px solid #0f766b",
              borderRadius: 8, padding: "6px 12px", fontSize: 12.5, fontWeight: 600,
              cursor: running ? "not-allowed" : "pointer",
            }}>{p.label}</button>
          ))}
        </div>
        <textarea
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          disabled={running}
          rows={4}
          style={{
            width: "100%", border: "1px solid #dce1e8", borderRadius: 9, padding: "10px 12px",
            fontSize: 14, color: "#161d2b", background: "#fff", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.6,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
          <button onClick={run} disabled={running || selected.size === 0 || !direction.trim()} style={{
            background: running || selected.size === 0 ? "#9fb4ae" : "#0f766b",
            color: "#fff", border: "none", borderRadius: 9, padding: "10px 20px",
            fontSize: 13.5, fontWeight: 700, cursor: running || selected.size === 0 ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            {running ? (
              <>
                <span style={{ display: "inline-block", width: 13, height: 13, border: "2px solid rgba(255,255,255,.35)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                リライト中… ({doneCount}/{selected.size})
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </>
            ) : `選択した ${selected.size} 件をリライト`}
          </button>
          <span style={{ fontSize: 12, color: "#697587" }}>
            公開中の記事はそのまま直接更新されます（再投稿不要）。未公開の記事は「編集画面」に入ります
          </span>
        </div>
      </div>

      {/* 記事一覧 */}
      <div style={{ background: "#fff", border: "1px solid #dce1e8", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid #dce1e8" }}>
          <input type="checkbox" checked={selected.size === articles.length && articles.length > 0} onChange={toggleAll} disabled={running} style={{ width: 16, height: 16 }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>全選択</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#697587", fontFamily: "monospace" }}>{articles.length}件</span>
        </div>

        {articles.length === 0 && (
          <div style={{ padding: "32px", textAlign: "center", color: "#697587", fontSize: 13 }}>記事がありません</div>
        )}

        {articles.map((a) => {
          const tcolor = TEMPLATE_COLORS[a.template ?? ""] ?? "#697587";
          const st = results[a.id];
          return (
            <label key={a.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
              borderBottom: "1px solid #eef1f5", cursor: running ? "default" : "pointer",
              background: current === a.id ? "#f0fdf4" : "#fff",
            }}>
              <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} disabled={running} style={{ width: 16, height: 16, flexShrink: 0 }} />
              {a.template && (
                <span style={{ background: tcolor, color: "#fff", borderRadius: 5, padding: "2px 8px", fontSize: 10.5, fontWeight: 700, fontFamily: "monospace", flexShrink: 0 }}>{a.template}</span>
              )}
              <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: "#161d2b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</span>
              <span style={{ fontSize: 11, color: "#9ba8b5", fontFamily: "monospace", flexShrink: 0 }}>{a.status}</span>
              {st && (
                <span style={{ fontSize: 11, fontWeight: 700, flexShrink: 0, color: st === "done" ? "#0f766b" : st === "error" ? "#c4453a" : "#b07d2e" }}>
                  {st === "running" ? "処理中…" : st === "done" ? "✓ 完了" : st === "error" ? "失敗" : ""}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
