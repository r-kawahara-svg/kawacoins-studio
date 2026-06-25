"use client";

import { useState, useTransition } from "react";
import { publishArticle } from "@/app/actions/articles";

export function PublishButton({ articleId }: { articleId: string }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [pressed, setPressed] = useState(false);

  function handleClick() {
    setDone(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("articleId", articleId);
      await publishArticle(fd);
      setDone(true);
    });
  }

  const bg = done ? "#16a34a" : isPending ? "#0a5249" : "#0f766b";

  return (
    <button
      onClick={handleClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      disabled={isPending || done}
      style={{
        background: bg,
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "8px 20px",
        fontSize: 13,
        fontWeight: 600,
        cursor: isPending || done ? "not-allowed" : "pointer",
        minHeight: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        transform: pressed && !isPending && !done ? "scale(0.96)" : "scale(1)",
        boxShadow: pressed && !isPending && !done
          ? "inset 0 2px 5px rgba(0,0,0,0.25)"
          : "0 1px 3px rgba(15,118,107,0.35)",
        transition: "background 0.15s, transform 0.08s, box-shadow 0.08s",
      }}
    >
      {done ? (
        <>✓ 投稿完了</>
      ) : isPending ? (
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
