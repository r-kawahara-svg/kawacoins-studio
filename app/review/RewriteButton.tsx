"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TEMPLATE_OPTIONS = [
  { id: "T1", name: "T1 体験レビュー型" },
  { id: "T2", name: "T2 比較ランキング型" },
  { id: "T3", name: "T3 始め方解説型" },
  { id: "T4", name: "T4 決算個別株型" },
  { id: "T5", name: "T5 失敗談・教訓型" },
  { id: "T6", name: "T6 制度解説型" },
];

export function RewriteButton({ articleId, currentTemplate }: { articleId: string; currentTemplate: string | null }) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState("");
  const [template, setTemplate] = useState(currentTemplate ?? "T6");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleRewrite() {
    if (!direction.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/articles/${articleId}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, template }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "書き直しに失敗しました");
        return;
      }
      setOpen(false);
      setDirection("");
      router.refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "#fff",
          color: "#697587",
          border: "1px solid #dce1e8",
          borderRadius: 8,
          padding: "6px 14px",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          minHeight: 36,
        }}
      >
        ✏️ 方針変更して書き直し
      </button>
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1.5px solid #b07d2e",
        borderRadius: 12,
        padding: "16px 18px",
        marginBottom: 16,
        boxShadow: "0 2px 8px rgba(176,125,46,.10)",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13.5, color: "#161d2b", marginBottom: 12 }}>
        ✏️ 記事全文を書き直す
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11.5, color: "#697587", fontWeight: 600, marginBottom: 4 }}>テンプレート</div>
        <select
          value={template}
          onChange={e => setTemplate(e.target.value)}
          style={{
            width: "100%",
            border: "1px solid #dce1e8",
            borderRadius: 7,
            padding: "8px 10px",
            fontSize: 13,
            color: "#161d2b",
            background: "#fff",
            fontFamily: "inherit",
          }}
        >
          {TEMPLATE_OPTIONS.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11.5, color: "#697587", fontWeight: 600, marginBottom: 4 }}>
          書き直しの方針・追加指示
        </div>
        <textarea
          value={direction}
          onChange={e => setDirection(e.target.value)}
          placeholder="例: iDeCoの制度説明をメインに。失敗談ではなく、拠出上限引き上げのメリットと今すぐ口座開設すべき理由を中心に。松井証券のCTAを自然に導入する流れで。"
          rows={4}
          style={{
            width: "100%",
            border: "1px solid #dce1e8",
            borderRadius: 7,
            padding: "10px 12px",
            fontSize: 14,
            color: "#161d2b",
            fontFamily: "inherit",
            resize: "vertical",
            boxSizing: "border-box",
            lineHeight: 1.6,
          }}
        />
      </div>

      {error && (
        <div style={{ color: "#c4453a", fontSize: 12.5, marginBottom: 10 }}>{error}</div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleRewrite}
          disabled={loading || !direction.trim()}
          style={{
            flex: 1,
            background: loading || !direction.trim() ? "#dce1e8" : "#b07d2e",
            color: loading || !direction.trim() ? "#9ba8b5" : "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 0",
            fontSize: 13.5,
            fontWeight: 700,
            cursor: loading || !direction.trim() ? "not-allowed" : "pointer",
            minHeight: 44,
          }}
        >
          {loading ? "生成中… (30秒ほどかかります)" : "書き直す"}
        </button>
        <button
          onClick={() => { setOpen(false); setError(""); }}
          disabled={loading}
          style={{
            background: "#f0f4f8",
            color: "#697587",
            border: "none",
            borderRadius: 8,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            minHeight: 44,
          }}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
