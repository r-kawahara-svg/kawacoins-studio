"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error]", error);
  }, [error]);

  return (
    <html lang="ja">
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#f7fafc" }}>
        <div style={{ padding: "3rem 2rem", maxWidth: "600px", margin: "4rem auto" }}>
          <h1 style={{ color: "#c53030", fontSize: "1.5rem" }}>
            アプリケーションエラー
          </h1>
          <p style={{ color: "#4a5568", marginTop: "0.75rem", lineHeight: 1.6 }}>
            {process.env.NODE_ENV === "development"
              ? error.message
              : "予期しないエラーが発生しました。しばらく待ってから再試行してください。"}
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.75rem", color: "#a0aec0", marginTop: "0.5rem" }}>
              エラーID: {error.digest}
            </p>
          )}
          <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
            <button
              onClick={() => unstable_retry()}
              style={{
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
                padding: "0.5rem 1.25rem",
                background: "#e2e8f0",
                color: "#2d3748",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "0.9rem",
              }}
            >
              トップへ戻る
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
