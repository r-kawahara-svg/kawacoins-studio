"use client";

import { useTransition } from "react";
import { publishArticle } from "@/app/actions/articles";

export function PublishButton({ articleId }: { articleId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("articleId", articleId);
      await publishArticle(fd);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      style={{
        background: isPending ? "#0a5249" : "#0f766b",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "8px 20px",
        fontSize: 13,
        fontWeight: 600,
        cursor: isPending ? "not-allowed" : "pointer",
        minHeight: 36,
        display: "flex",
        alignItems: "center",
        gap: 8,
        transition: "background 0.15s",
      }}
    >
      {isPending ? (
        <>
          <span style={{
            display: "inline-block",
            width: 13,
            height: 13,
            border: "2px solid rgba(255,255,255,0.35)",
            borderTopColor: "#fff",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
            flexShrink: 0,
          }} />
          投稿中…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      ) : "WPに投稿する"}
    </button>
  );
}
