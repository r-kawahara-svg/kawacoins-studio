"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: sbError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setLoading(false);
    if (sbError) { setError(sbError.message); return; }
    setSent(true);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#e9ecf0" }}>
      <div style={{ background: "#fff", border: "1px solid #dce1e8", borderRadius: 14, padding: "36px 40px", width: 380, boxShadow: "0 8px 24px rgba(22,29,43,.08)" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 18, color: "#161d2b", display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
            <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "#0f766b" }} />
            記事スタジオ
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "#7d889b" }}>kawacoins.com</div>
        </div>

        {sent ? (
          <div style={{ textAlign: "center", color: "#0f766b", fontSize: 14, lineHeight: 1.7 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
            <p>Magic Linkを <strong>{email}</strong> へ送信しました。</p>
            <p style={{ color: "#697587", fontSize: 12, marginTop: 8 }}>メール内のリンクをクリックしてログインしてください。</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#697587", display: "block", marginBottom: 6 }}>メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
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
