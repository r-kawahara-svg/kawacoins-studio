"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 失敗談の生データ（事実＋写真）を入力してT5記事を生成する
export function FailureStoryForm() {
  const [facts, setFacts] = useState("");
  const [lesson, setLesson] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!facts.trim()) return;
    setLoading(true); setError("");
    try {
      const fd = new FormData();
      fd.set("facts", facts);
      fd.set("lesson", lesson);
      files.slice(0, 6).forEach(f => fd.append("images", f));
      const res = await fetch("/api/failure-story", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "生成に失敗しました"); return; }
      router.push(`/articles/${data.articleId}`);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#697587", display: "block", marginBottom: 5 };
  const input: React.CSSProperties = { width: "100%", border: "1px solid #dce1e8", borderRadius: 9, padding: "11px 13px", fontSize: 15, color: "#1f2937", boxSizing: "border-box", lineHeight: 1.7, fontFamily: "inherit" };

  return (
    <form onSubmit={submit} style={{ background: "#fff", border: "1px solid #e3e6ea", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
      <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>失敗談から記事を作る（T5）</div>
      <div style={{ fontSize: 12, color: "#697587", marginBottom: 14 }}>
        あなたの失敗の事実を書くと、それを改変せずに教訓記事へ膨らませます。一次体験こそ最大の差別化です。
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={label}>失敗の事実（いつ／何の銘柄／いくら／どう動いて／結果）</label>
        <textarea value={facts} onChange={e => setFacts(e.target.value)} rows={5} required
          placeholder="例: 2024年3月、◯◯電線を信用で200万円分。決算跨ぎで持ち越したら翌日ストップ安。狼狽売りして80万円の損失。"
          style={input} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={label}>今ならどうするか（任意）</label>
        <input value={lesson} onChange={e => setLesson(e.target.value)}
          placeholder="例: 決算跨ぎは現物・少額に限定する" style={{ ...input, fontSize: 15 }} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={label}>写真（任意・複数可：取引画面のスクショ、チャート等）</label>
        <input type="file" accept="image/*" multiple onChange={e => setFiles(Array.from(e.target.files ?? []))}
          style={{ fontSize: 13, color: "#374151" }} />
        {files.length > 0 && <div style={{ fontSize: 11.5, color: "#697587", marginTop: 6 }}>{files.length}枚 選択中</div>}
        <div style={{ fontSize: 11.5, color: "#9c4f47", background: "#faf0ef", border: "1px solid #e0b8b3", borderRadius: 8, padding: "8px 11px", marginTop: 8, lineHeight: 1.6 }}>
          ⚠ 金額の口座残高・口座番号・氏名など個人情報が写っていないか確認してください（必要なら隠してから添付）。
        </div>
      </div>

      {error && <div style={{ color: "#c4453a", fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <button type="submit" disabled={loading || !facts.trim()} style={{
        background: loading || !facts.trim() ? "#9fb4ae" : "#b83030", color: "#fff", border: "none",
        borderRadius: 9, padding: "11px 22px", fontSize: 14, fontWeight: 700,
        cursor: loading || !facts.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8,
      }}>
        {loading ? (
          <>
            <span style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,.35)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
            生成中…（30秒ほど）
          </>
        ) : "失敗談記事を作る"}
      </button>
    </form>
  );
}
