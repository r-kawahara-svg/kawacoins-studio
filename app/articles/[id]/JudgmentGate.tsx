"use client";

import { useState } from "react";
import { updateJudgment } from "@/app/actions/articles";

interface JudgmentGateProps {
  articleId: string;
  initial: {
    tradeView: string | null;
    position: string | null;
    uniqueTake: string | null;
    completed: boolean | null;
  };
}

export function JudgmentGate({ articleId, initial }: JudgmentGateProps) {
  const [tradeView, setTradeView] = useState(initial.tradeView ?? "");
  const [position, setPosition] = useState(initial.position ?? "");
  const [uniqueTake, setUniqueTake] = useState(initial.uniqueTake ?? "");

  const filledCount = [tradeView, position, uniqueTake].filter((v) => v.trim()).length;
  const progressPct = Math.round((filledCount / 3) * 100);

  return (
    <div
      style={{
        background: "#fff",
        border: "1.5px solid #dce1e8",
        borderRadius: 14,
        padding: "20px 22px",
        boxShadow: "0 1px 4px rgba(22,29,43,.06)",
      }}
    >
      <div
        style={{
          fontFamily: "monospace",
          fontWeight: 700,
          fontSize: 13,
          color: "#161d2b",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        判断ゲート
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: filledCount === 3 ? "#0f766b" : "#b07d2e",
            fontWeight: 600,
          }}
        >
          {filledCount}/3 完了 ({progressPct}%)
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 4,
          borderRadius: 4,
          background: "#dce1e8",
          marginBottom: 16,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressPct}%`,
            background: filledCount === 3 ? "#0f766b" : "#b07d2e",
            borderRadius: 4,
            transition: "width 0.3s ease",
          }}
        />
      </div>

      <form action={updateJudgment}>
        <input type="hidden" name="articleId" value={articleId} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <FieldLabel label="トレード観 [JUDGMENT:trade]">
            <textarea
              name="tradeView"
              rows={3}
              value={tradeView}
              onChange={(e) => setTradeView(e.target.value)}
              placeholder="例: この銘柄は需給改善が見込まれるため、中期的に買い目線で考えられる"
              style={textareaStyle}
            />
          </FieldLabel>

          <FieldLabel label="ポジション [JUDGMENT:position]">
            <textarea
              name="position"
              rows={3}
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="例: 現在は現物で100株保有。追加購入の余地あり"
              style={textareaStyle}
            />
          </FieldLabel>

          <FieldLabel label="独自見解 [JUDGMENT:take]">
            <textarea
              name="uniqueTake"
              rows={3}
              value={uniqueTake}
              onChange={(e) => setUniqueTake(e.target.value)}
              placeholder="例: 市場のコンセンサスとは異なり、今期は増益余地があると考えている"
              style={textareaStyle}
            />
          </FieldLabel>
        </div>

        <button
          type="submit"
          style={{
            marginTop: 14,
            background: "#0f766b",
            color: "#fff",
            border: "none",
            borderRadius: 9,
            padding: "9px 20px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          判断を保存
        </button>
      </form>
    </div>
  );
}

const textareaStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #dce1e8",
  borderRadius: 9,
  padding: "8px 12px",
  fontSize: 13,
  color: "#161d2b",
  background: "#fafbfc",
  fontFamily: "inherit",
  resize: "vertical",
  boxSizing: "border-box",
};

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: "#697587",
          marginBottom: 4,
          fontFamily: "monospace",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
