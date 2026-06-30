"use client";

import { useState } from "react";

// X(Twitter)へコピペ投稿するための文章を生成・コピーする（X APIは使わない）
export function XPostBox({ articleId }: { articleId: string }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true); setError(""); setCopied(false);
    try {
      const res = await fetch("/api/x-post", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "生成に失敗しました"); return; }
      setText(data.text ?? "");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard 不可 */ }
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e3e6ea", borderRadius: 12, padding: "14px 16px", marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>𝕏 投稿文（コピペ用）</span>
        <button onClick={generate} disabled={loading} style={{
          marginLeft: "auto", background: loading ? "#9fb4ae" : "#0f766b", color: "#fff", border: "none",
          borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
        }}>
          {loading ? "生成中…" : text ? "作り直す" : "投稿文を作る"}
        </button>
      </div>
      {error && <div style={{ color: "#c4453a", fontSize: 12, marginBottom: 8 }}>{error}</div>}
      {text && (
        <>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
            style={{ width: "100%", border: "1px solid #dce1e8", borderRadius: 9, padding: "10px 12px", fontSize: 14, color: "#1f2937", boxSizing: "border-box", lineHeight: 1.7, fontFamily: "inherit" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
            <button onClick={copy} style={{ background: copied ? "#16a34a" : "#1f2937", color: "#fff", border: "none", borderRadius: 7, padding: "7px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              {copied ? "✓ コピーしました" : "コピーする"}
            </button>
            <span style={{ fontSize: 11, color: "#9aa3af" }}>Xアプリに貼り付けて投稿してください（{[...text].length}字）</span>
          </div>
        </>
      )}
      {!text && !error && (
        <div style={{ fontSize: 12, color: "#9aa3af" }}>記事の要点＋URL＋ハッシュタグの投稿文を作成します。</div>
      )}
    </div>
  );
}
