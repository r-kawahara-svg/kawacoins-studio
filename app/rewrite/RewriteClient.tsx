"use client";

import { useState } from "react";

interface WpPost {
  id: number;
  title: string;
  link: string;
  status: string;
  date: string;
}

type RunState = "running" | "done" | "error";
type RunResult = { state: RunState; detail?: string };

const STATUS_LABEL: Record<string, string> = {
  publish: "公開", draft: "下書き", future: "予約", pending: "承認待ち", private: "非公開",
};

export function RewriteClient({ posts, currentYear, viewsMap, gaConfigured }: {
  posts: WpPost[];
  currentYear: number;
  viewsMap: Record<number, number | null>;
  gaConfigured: boolean;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [direction, setDirection] = useState(
    `記事全体を読み直し、不自然・分かりにくい箇所を自然な文章に書き直す。\n` +
    `走り書きのようなコメント（例「安いので！」）は理由や文脈を補って整える。\n` +
    `古い年号や「今年」は${currentYear}年基準に直す。事実や数値は変えない。`
  );
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<number, RunResult>>({});
  const [current, setCurrent] = useState<number | null>(null);
  const [eyecatchRun, setEyecatchRun] = useState<Record<number, "running" | "done" | "error">>({});

  async function regenEyecatch(id: number) {
    setEyecatchRun((r) => ({ ...r, [id]: "running" }));
    try {
      const res = await fetch(`/api/wp-eyecatch`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: id }),
      });
      setEyecatchRun((r) => ({ ...r, [id]: res.ok ? "done" : "error" }));
    } catch {
      setEyecatchRun((r) => ({ ...r, [id]: "error" }));
    }
  }

  const PRESETS: { label: string; text: string }[] = [
    {
      label: `📅 最新年(${currentYear})に更新`,
      text: `古い年号や「今年」「最新」表現を${currentYear}年基準に直す。未確定の制度は「予定」「審議中」と明記し断定しない。事実・数値は変えない。`,
    },
    {
      label: "🔍 全体を見直して整える",
      text: `記事全体を読み直し、不自然・分かりにくい箇所を書き直す。走り書きのようなコメント（例「安いので！」）は理由や文脈を補って自然な文章にする。回りくどい/冗長な文や唐突な言い回しも直す。事実や数値は変えず、表現と読みやすさだけ改善する。`,
    },
    {
      label: "🔥 体験を足してリライト",
      text: `この記事に筆者の一次体験（実際に保有/売買した銘柄・使用感・失敗談など）を具体的に加筆し、実体験で差別化する。比較・解説部分は活かしつつ、体験エピソードを厚くする。事実は創作せず、自然な一人称で。`,
    },
    {
      label: "🔁 最新年＋全体見直し",
      text: `古い年号や「今年」は${currentYear}年基準に直し（未確定は「予定」と明記）、記事全体を読み直して不自然な箇所（走り書きコメント等）を自然な文章に整える。事実や数値は変えない。`,
    },
  ];

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => prev.size === posts.length ? new Set() : new Set(posts.map(p => p.id)));
  }

  async function run() {
    if (selected.size === 0 || !direction.trim()) return;
    setRunning(true);
    const ids = posts.filter(p => selected.has(p.id)).map(p => p.id);
    for (const id of ids) {
      setCurrent(id);
      setResults((r) => ({ ...r, [id]: { state: "running" } }));
      try {
        const res = await fetch(`/api/wp-rewrite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: id, direction }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          setResults((r) => ({ ...r, [id]: { state: "done", detail: "WP記事を更新しました" } }));
        } else {
          setResults((r) => ({ ...r, [id]: { state: "error", detail: data.error ?? `HTTP ${res.status}` } }));
        }
      } catch (e) {
        setResults((r) => ({ ...r, [id]: { state: "error", detail: String(e) } }));
      }
    }
    setCurrent(null);
    setRunning(false);
  }

  const doneCount = Object.values(results).filter(s => s.state === "done").length;

  return (
    <div>
      {/* 指示プリセット */}
      <div style={{ background: "#fff", border: "1px solid #dce1e8", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#161d2b", marginBottom: 10 }}>リライト指示</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {PRESETS.map((p) => (
            <button key={p.label} onClick={() => setDirection(p.text)} disabled={running} style={{
              background: "#f2f5f4", color: "#3f5a55", border: "1px solid #c3d2ce",
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
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
            WordPress記事を直接書き換えます（公開状態のまま・再投稿不要）
          </span>
        </div>
      </div>

      {/* WP記事一覧 */}
      <div style={{ background: "#fff", border: "1px solid #dce1e8", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid #dce1e8" }}>
          <input type="checkbox" checked={selected.size === posts.length && posts.length > 0} onChange={toggleAll} disabled={running} style={{ width: 16, height: 16 }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>全選択</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#697587", fontFamily: "monospace" }}>
            {gaConfigured ? "PV=直近365日" : ""} WP {posts.length}件
          </span>
        </div>

        {posts.length === 0 && (
          <div style={{ padding: "32px", textAlign: "center", color: "#697587", fontSize: 13 }}>WordPress記事がありません</div>
        )}

        {[...posts].sort((a, b) => (viewsMap[b.id] ?? -1) - (viewsMap[a.id] ?? -1)).map((p, idx) => {
          const st = results[p.id];
          const pv = viewsMap[p.id] ?? 0;
          const isTopPv = pv > 0 && idx < 3; // PV上位3記事を強調（育成候補）
          return (
            <label key={p.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
              borderBottom: "1px solid #eef1f5", cursor: running ? "default" : "pointer",
              borderLeft: isTopPv ? "3px solid #d98a1f" : "3px solid transparent",
              background: current === p.id ? "#f0fdf4" : isTopPv ? "#fdfaf2" : "#fff",
            }}>
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} disabled={running} style={{ width: 16, height: 16, flexShrink: 0 }} />
              {isTopPv && (
                <span style={{ background: "#f8eccf", color: "#8a6d2f", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap" }} title="PVが付いている育成候補。体験を足して伸ばそう">🔥 育成候補</span>
              )}
              <span style={{ background: "#eef2f7", color: "#475569", borderRadius: 5, padding: "2px 8px", fontSize: 10.5, fontWeight: 700, fontFamily: "monospace", flexShrink: 0 }}>
                {STATUS_LABEL[p.status] ?? p.status}
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: "#161d2b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
              <span style={{ fontSize: 11.5, fontFamily: "monospace", flexShrink: 0, minWidth: 70, textAlign: "right", color: (viewsMap[p.id] ?? 0) > 0 ? "#0f766b" : "#9ba8b5" }} title="直近365日のPV">
                {viewsMap[p.id] == null ? "—" : `${viewsMap[p.id]!.toLocaleString()} PV`}
              </span>
              {/* アイキャッチ再生成（チェックボックスを切り替えないよう伝播停止） */}
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); regenEyecatch(p.id); }}
                disabled={eyecatchRun[p.id] === "running"}
                title="アイキャッチ画像を再生成"
                style={{
                  flexShrink: 0, fontSize: 11, fontWeight: 600,
                  color: eyecatchRun[p.id] === "done" ? "#0f766b" : "#5b6470",
                  background: "#f2f5f4", border: "1px solid #d6dee0",
                  borderRadius: 7, padding: "5px 9px", whiteSpace: "nowrap", minHeight: 32,
                }}
              >
                {eyecatchRun[p.id] === "running" ? "生成中…" : eyecatchRun[p.id] === "done" ? "✓ 画像更新" : eyecatchRun[p.id] === "error" ? "画像失敗" : "🖼 アイキャッチ"}
              </button>
              {p.date && <span style={{ fontSize: 11, color: "#9ba8b5", fontFamily: "monospace", flexShrink: 0 }}>{p.date.slice(0, 10)}</span>}
              {st && (
                <span style={{ fontSize: 11, fontWeight: 700, flexShrink: 0, textAlign: "right", color: st.state === "done" ? "#0f766b" : st.state === "error" ? "#c4453a" : "#b07d2e" }}>
                  {st.state === "running" ? "処理中…" : st.state === "done" ? "✓ 完了" : "失敗"}
                  {st.detail && <span style={{ display: "block", fontWeight: 400, fontSize: 10, color: "#697587" }}>{st.detail}</span>}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
