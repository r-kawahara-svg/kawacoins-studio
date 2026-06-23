"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GenerateButton({ topicId }: { topicId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/articles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId }),
      });
      if (!res.ok) throw new Error("Generate failed");
      const { articleId } = await res.json();
      router.push(`/articles/${articleId}`);
    } catch (err) {
      console.error(err);
      alert("生成に失敗しました。もう一度お試しください。");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      style={{
        background: loading ? "#697587" : "#0f766b",
        border: "none",
        borderRadius: 9,
        padding: "7px 14px",
        fontSize: 13,
        fontWeight: 600,
        color: "#fff",
        cursor: loading ? "not-allowed" : "pointer",
        minWidth: 90,
      }}
    >
      {loading ? "生成中…" : "下書き生成"}
    </button>
  );
}
