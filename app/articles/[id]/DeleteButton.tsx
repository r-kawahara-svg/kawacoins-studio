"use client";

import { useTransition } from "react";
import { deleteArticle } from "@/app/actions/articles";

interface Props {
  articleId: string;
  hasWpPost: boolean;
  /** compact=true のときはアイコンのみの小さいボタン */
  compact?: boolean;
}

export function DeleteButton({ articleId, hasWpPost, compact = false }: Props) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const msg = hasWpPost
      ? "この記事をアプリから削除しますか？\n\n※ WordPress側の投稿は削除されません。\n  WP管理画面から別途削除してください。"
      : "この記事を削除しますか？\n（この操作は元に戻せません）";
    if (!window.confirm(msg)) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.append("articleId", articleId);
      await deleteArticle(fd);
    });
  }

  if (compact) {
    return (
      <button
        onClick={handleClick}
        disabled={pending}
        title="記事を削除"
        style={{
          background: "none",
          border: "1px solid #dce1e8",
          borderRadius: 7,
          padding: "5px 10px",
          fontSize: 12,
          color: pending ? "#aeb8c8" : "#c4453a",
          cursor: pending ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
          whiteSpace: "nowrap",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
        {pending ? "削除中…" : "削除"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      style={{
        background: pending ? "#f5f6f8" : "#fff0f0",
        border: "1.5px solid #c4453a",
        borderRadius: 9,
        padding: "8px 18px",
        fontSize: 13,
        fontWeight: 600,
        color: pending ? "#aeb8c8" : "#c4453a",
        cursor: pending ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4h6v2" />
      </svg>
      {pending ? "削除中…" : "記事を削除"}
    </button>
  );
}
