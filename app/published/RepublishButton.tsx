"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RepublishButton({ articleId, wpPostId }: { articleId: string; wpPostId: number | null }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handle() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/articles/${articleId}/republish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "失敗"); return; }
      setDone(true);
      router.refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  if (done) return <span style={{ fontSize: 12, color: "#0f766b", fontWeight: 600 }}>✓ 更新済み</span>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
      <button
        onClick={handle}
        disabled={loading}
        style={{
          background: loading ? "#dce1e8" : "#0f766b",
          color: loading ? "#697587" : "#fff",
          border: "none", borderRadius: 7, padding: "6px 14px",
          fontSize: 12, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
        }}
      >
        {loading ? (
          <>
            <span style={{
              display: "inline-block", width: 11, height: 11,
              border: "2px solid rgba(100,100,100,.3)", borderTopColor: "#697587",
              borderRadius: "50%", animation: "spin 0.7s linear infinite",
            }} />
            処理中…
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        ) : "アイキャッチ再生成 + WP更新"}
      </button>
      {error && <span style={{ fontSize: 11, color: "#c4453a" }}>{error}</span>}
    </div>
  );
}
