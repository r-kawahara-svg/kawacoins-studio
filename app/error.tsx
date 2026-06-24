"use client";

import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2 style={{ color: "#c53030" }}>ページの読み込み中にエラーが発生しました</h2>
      <p style={{ color: "#4a5568", marginTop: "0.5rem" }}>
        {process.env.NODE_ENV === "development"
          ? error.message
          : "しばらく待ってから再試行してください。"}
      </p>
      {error.digest && (
        <p style={{ fontSize: "0.75rem", color: "#718096", marginTop: "0.5rem" }}>
          エラーID: {error.digest}
        </p>
      )}
      <button
        onClick={() => unstable_retry()}
        style={{
          marginTop: "1.5rem",
          padding: "0.5rem 1.25rem",
          background: "#2b6cb0",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "0.9rem",
        }}
      >
        再試行する
      </button>
      <a
        href="/"
        style={{
          display: "inline-block",
          marginTop: "0.75rem",
          marginLeft: "1rem",
          color: "#2b6cb0",
          fontSize: "0.9rem",
        }}
      >
        トップへ戻る
      </a>
    </div>
  );
}
