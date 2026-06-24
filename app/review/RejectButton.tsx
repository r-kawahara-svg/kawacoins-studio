"use client";
import { useState } from "react";

export function RejectButton({ articleId }: { articleId: string }) {
  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState("");
  const [revise, setRevise] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    await fetch(`/api/articles/${articleId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revise, memo }),
    });
    setDone(true);
    setLoading(false);
  }

  if (done) return <span style={{ fontSize: 12, color: "#697587" }}>{revise ? "差し戻し済み" : "却下済み"}</span>;

  return (
    <>
      <button onClick={() => setOpen(!open)} style={{ background: "none", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 7, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>
        却下 / 差し戻し
      </button>
      {open && (
        <div style={{ background: "#fff", border: "1px solid #dce1e8", borderRadius: 10, padding: "12px 14px", marginTop: 8 }}>
          <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <input type="checkbox" checked={revise} onChange={(e) => setRevise(e.target.checked)} />
            差し戻し（draft へ戻す）
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="理由・メモ（任意）"
            rows={2}
            style={{ width: "100%", borderRadius: 6, border: "1px solid #dce1e8", padding: "6px 8px", fontSize: 12, boxSizing: "border-box" }}
          />
          <button onClick={submit} disabled={loading} style={{ marginTop: 8, background: "#991b1b", color: "#fff", border: "none", borderRadius: 7, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>
            {loading ? "処理中…" : revise ? "差し戻す" : "却下する"}
          </button>
        </div>
      )}
    </>
  );
}
