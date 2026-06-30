"use client";

import { useState } from "react";
import { adoptSuggestedTopic } from "@/app/actions/topics";
import type { TopicSuggestion } from "@/app/api/topics/suggest/route";

const TEMPLATE_DESC: Record<string, string> = {
  T1: "体験レビュー",
  T2: "比較",
  T3: "始め方",
  T4: "決算個別株",
  T5: "失敗談",
  T6: "制度解説",
};

function ScoreDots({ score }: { score: number }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: i <= score ? "#b07d2e" : "#dce1e8" }} />
      ))}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  border: "1px solid #dce1e8",
  borderRadius: 9,
  padding: "11px 14px",
  fontSize: 16,
  color: "#161d2b",
  background: "#fff",
  fontFamily: "inherit",
  outline: "none",
  minHeight: 48,
};

export function SuggestPanel() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [adopted, setAdopted] = useState<Set<number>>(new Set());
  const [adoptingIdx, setAdoptingIdx] = useState<number | null>(null);

  async function handleSuggest(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;
    setError("");
    setLoading(true);
    setSuggestions([]);
    setAdopted(new Set());

    const res = await fetch("/api/topics/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    });
    const data = await res.json() as { suggestions?: TopicSuggestion[]; error?: string };
    setLoading(false);

    if (!res.ok || !data.suggestions) {
      setError(data.error ?? "提案の取得に失敗しました");
      return;
    }
    setSuggestions(data.suggestions);
  }

  async function handleAdopt(suggestion: TopicSuggestion, idx: number) {
    setAdoptingIdx(idx);
    await adoptSuggestedTopic(suggestion);
    setAdopted(prev => new Set([...prev, idx]));
    setAdoptingIdx(null);
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #dce1e8", borderRadius: 14, marginBottom: 20, padding: "20px 24px", boxShadow: "0 1px 2px rgba(22,29,43,.04)" }}>
      <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
        AIネタ提案
      </div>
      <div style={{ fontSize: 12, color: "#697587", marginBottom: 14 }}>
        キーワードを入れると、収益性の高い記事ネタを3案提案します
      </div>

      <form onSubmit={handleSuggest} style={{ display: "flex", gap: 10, marginBottom: suggestions.length > 0 || error || loading ? 20 : 0 }}>
        <input
          type="text"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder="例: 松井証券 NISA"
          required
          style={inputStyle}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            background: "#161d2b",
            color: "#fff",
            border: "none",
            borderRadius: 9,
            padding: "9px 20px",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {loading ? "生成中…" : "ネタを提案"}
        </button>
      </form>

      {error && (
        <div style={{ color: "#c4453a", fontSize: 13, marginBottom: 12 }}>{error}</div>
      )}

      {loading && (
        <div style={{ display: "flex", gap: 12, paddingBottom: 4 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ flex: 1, background: "#f0f4f8", borderRadius: 10, height: 100, animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {suggestions.map((s, i) => {
            const isAdopted = adopted.has(i);
            const isAdopting = adoptingIdx === i;
            return (
              <div
                key={i}
                style={{
                  border: `1.5px solid ${isAdopted ? "#0f766b" : "#dce1e8"}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  background: isAdopted ? "#f0fdf4" : "#fafbfc",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  transition: "border-color 0.2s, background 0.2s",
                }}
              >
                {/* Template badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{
                    background: "#161d2b", color: "#8b9ab0",
                    borderRadius: 5, padding: "2px 8px",
                    fontSize: 10.5, fontWeight: 700, fontFamily: "monospace",
                  }}>
                    {s.template} {TEMPLATE_DESC[s.template] ?? ""}
                  </span>
                  <ScoreDots score={s.revenue_score} />
                </div>

                {/* Title */}
                <div style={{ fontWeight: 700, fontSize: 13.5, color: "#161d2b", lineHeight: 1.45 }}>
                  {s.title}
                </div>

                {/* Keyword */}
                <div style={{ fontSize: 11.5, color: "#697587", fontFamily: "monospace" }}>
                  「{s.keyword}」
                </div>

                {/* Summary */}
                <div style={{ fontSize: 12, color: "#4a5568", lineHeight: 1.55 }}>
                  {s.summary}
                </div>

                {/* 必要な一次体験 */}
                {s.required_experience && (
                  <div style={{ fontSize: 11.5, color: "#8a6d2f", background: "#fbf6e9", border: "1px solid #ecdcb0", borderRadius: 8, padding: "7px 10px", lineHeight: 1.5, flex: 1 }}>
                    <span style={{ fontWeight: 700 }}>必要な体験：</span>{s.required_experience}
                  </div>
                )}

                {/* Adopt button */}
                <button
                  disabled={isAdopted || isAdopting}
                  onClick={() => handleAdopt(s, i)}
                  style={{
                    marginTop: 4,
                    background: isAdopted ? "#0f766b" : "#161d2b",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "7px 14px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: isAdopted || isAdopting ? "not-allowed" : "pointer",
                    opacity: isAdopting ? 0.7 : 1,
                    width: "100%",
                  }}
                >
                  {isAdopted ? "✓ 採用済み" : isAdopting ? "保存中…" : "採用してキューに追加"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
