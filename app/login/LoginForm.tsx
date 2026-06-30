"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  mode: "password" | "magic-link";
}

export default function LoginForm({ mode }: Props) {
  const [value, setValue] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "password") {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: value }),
      });
      const data = await res.json() as { error?: string };
      setLoading(false);
      if (!res.ok) { setError(data.error ?? "エラーが発生しました"); return; }
      // フルリロードで Cookie を反映させてから / へ
      window.location.href = "/";
      return;
    }

    // Magic Link フロー
    const supabase = createClient();
    const { error: sbError } = await supabase.auth.signInWithOtp({
      email: value,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setLoading(false);
    if (sbError) { setError(sbError.message); return; }
    setSent(true);
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7f9", padding: 16 }}>
      <div style={{ background: "#fff", border: "1px solid #e8ebef", borderRadius: 16, padding: "36px 36px 32px", width: "100%", maxWidth: 380, boxShadow: "0 8px 30px rgba(31,41,55,.08)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 26 }}>
          <span style={{
            width: 52, height: 52, borderRadius: 14, marginBottom: 14,
            background: "linear-gradient(135deg,#0f766b 0%,#15937f 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(15,118,107,.3)",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19V10" /><path d="M10 19V5" /><path d="M16 19v-6" />
              <path d="M20.5 4.5l-2.8 2.8" /><path d="M21 8V4h-4" />
            </svg>
          </span>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#1f2937", fontFamily: "monospace" }}>記事スタジオ</div>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "#9aa3af", marginTop: 3 }}>kawacoins.com — 管理画面</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginBottom: 22, color: "#6b7280", fontSize: 12 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          関係者専用ページ
        </div>

        {mode === "password" ? (
          <form onSubmit={handleSubmit}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#697587", display: "block", marginBottom: 6 }}>合言葉パスワード</label>
            <input
              type="password"
              value={value}
              onChange={e => setValue(e.target.value)}
              required
              autoFocus
              placeholder="パスワードを入力"
              style={{ width: "100%", border: "1px solid #dce1e8", borderRadius: 9, padding: "10px 12px", fontSize: 14, color: "#161d2b", marginBottom: 8, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
            />
            {error && <p style={{ color: "#c4453a", fontSize: 12, marginBottom: 8 }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", background: "#0f766b", color: "#fff", border: "none", borderRadius: 9, padding: "11px", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "確認中..." : "ログイン"}
            </button>
          </form>
        ) : sent ? (
          <div style={{ textAlign: "center", color: "#0f766b", fontSize: 14, lineHeight: 1.7 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
            <p>Magic Linkを <strong>{value}</strong> へ送信しました。</p>
            <p style={{ color: "#697587", fontSize: 12, marginTop: 8 }}>メール内のリンクをクリックしてログインしてください。</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#697587", display: "block", marginBottom: 6 }}>メールアドレス</label>
            <input
              type="email"
              value={value}
              onChange={e => setValue(e.target.value)}
              required
              placeholder="your@email.com"
              style={{ width: "100%", border: "1px solid #dce1e8", borderRadius: 9, padding: "10px 12px", fontSize: 14, color: "#161d2b", marginBottom: 8, outline: "none", fontFamily: "inherit" }}
            />
            {error && <p style={{ color: "#c4453a", fontSize: 12, marginBottom: 8 }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", background: "#0f766b", color: "#fff", border: "none", borderRadius: 9, padding: "11px", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "送信中..." : "Magic Linkを送信"}
            </button>
            <p style={{ fontSize: 11, color: "#697587", marginTop: 10, textAlign: "center" }}>
              許可されたメールアドレスのみログインできます
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
