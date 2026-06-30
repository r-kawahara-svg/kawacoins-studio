// ページ遷移中に自動表示されるローディングUI（Next.js App Router）
// 上部プログレスバー＋中央スピナーで「動いている」ことを分かりやすく示す。
export default function Loading() {
  return (
    <div>
      {/* 上部の進行バー（不定アニメーション） */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: "#e3e6ea", zIndex: 60, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, height: "100%", background: "#0f766b", borderRadius: 2, animation: "loadingbar 1.1s ease-in-out infinite" }} />
      </div>
      {/* 中央スピナー */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 20px", gap: 14, color: "#6b7280" }}>
        <span style={{ width: 34, height: 34, border: "3px solid #e3e6ea", borderTopColor: "#0f766b", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <span style={{ fontSize: 13 }}>読み込み中…</span>
      </div>
    </div>
  );
}
