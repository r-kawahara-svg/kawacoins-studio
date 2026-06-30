"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 投稿ペース（月あたり本数）を入力し、その前提で予想を再計算する。
export function PaceForm({ defaultPace, autoPace }: { defaultPace: number; autoPace: number }) {
  const [v, setV] = useState(String(defaultPace));
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Math.max(0, Number(v) || 0);
    router.push(`/forecast?pace=${n}`);
  }

  return (
    <form onSubmit={submit} style={{
      background: "#fff", border: "1px solid #e3e6ea", borderRadius: 14,
      padding: "16px 18px", marginBottom: 20, display: "flex", flexWrap: "wrap",
      alignItems: "flex-end", gap: 14,
    }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 6 }}>
          投稿ペース（月あたり本数）でシミュレーション
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="number" min="0" step="1" value={v}
            onChange={e => setV(e.target.value)}
            style={{ width: 120, border: "1px solid #dce1e8", borderRadius: 9, padding: "10px 12px", fontSize: 16, color: "#1f2937", boxSizing: "border-box" }}
          />
          <span style={{ fontSize: 13, color: "#6b7280" }}>本 / 月</span>
        </div>
      </div>
      <button type="submit" style={{
        background: "#0f766b", color: "#fff", border: "none", borderRadius: 9,
        padding: "11px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
      }}>
        この前提で予想する
      </button>
      <button type="button" onClick={() => { setV(String(autoPace)); router.push("/forecast"); }} style={{
        background: "#f2f5f4", color: "#3f5a55", border: "1px solid #d6dee0", borderRadius: 9,
        padding: "11px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
      }}>
        実績ペースに戻す（{autoPace}本/月）
      </button>
    </form>
  );
}
