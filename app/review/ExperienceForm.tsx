"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ExpRow {
  id: string;
  label: string;
  choice: string | null;
  note: string | null;
  completed: boolean | null;
}

interface Props {
  articleId: string;
  slots: string[];
  initial: ExpRow[];
  template: string | null;
  articleStatus?: string;
}

const CHOICE_OPTIONS: Record<string, string[]> = {
  "使用感・メリット": ["満足", "ふつう", "不満"],
  "筆者の見解・注目ポイント": ["強気", "中立", "様子見"],
};

export function ExperienceForm({ articleId, slots, initial, template, articleStatus }: Props) {
  const initMap: Record<string, ExpRow> = {};
  for (const r of initial) initMap[r.label] = r;

  const [rows, setRows] = useState<Record<string, { choice: string; note: string; completed: boolean }>>(
    () => {
      const m: Record<string, { choice: string; note: string; completed: boolean }> = {};
      for (const s of slots) {
        m[s] = {
          choice: initMap[s]?.choice ?? "",
          note: initMap[s]?.note ?? "",
          completed: initMap[s]?.completed ?? false,
        };
      }
      return m;
    }
  );
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(articleStatus === "approved");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      for (const label of slots) {
        const row = rows[label];
        const filled = !!(row.choice.trim() || row.note.trim());
        await fetch(`/api/articles/${articleId}/experiences`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, choice: row.choice || null, note: row.note || null, completed: filled }),
        });
        setRows((prev) => ({ ...prev, [label]: { ...prev[label], completed: filled } }));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    setApproving(true);
    setError(null);
    try {
      const res = await fetch(`/api/articles/${articleId}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error + (data.missing ? `（未充足: ${data.missing.join(", ")}）` : ""));
      } else {
        setApproved(true);
        router.refresh();  // RSC再レンダリングで公開ボタンを出現させる
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setApproving(false);
    }
  }

  if (approved) {
    return (
      <div style={{ background: "#f0fdf4", border: "1px solid #0f766b", borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "#065f46", fontWeight: 600 }}>
        ✓ 承認済み — 記事一覧から「公開する」を実行できます
      </div>
    );
  }

  const allFilled = slots.every((s) => rows[s]?.completed);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: "#161d2b" }}>
        体験入力 ({template ?? "—"})
      </div>

      {slots.map((label) => {
        const choices = CHOICE_OPTIONS[label] ?? [];
        const row = rows[label];
        return (
          <div key={label} style={{ background: "#f8faf9", border: `1.5px solid ${row.completed ? "#0f766b" : "#dce1e8"}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#697587", marginBottom: 8 }}>
              {row.completed ? "✓ " : ""}{label}
            </div>

            {choices.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                {choices.map((c) => (
                  <button
                    key={c}
                    onClick={() => setRows((prev) => ({ ...prev, [label]: { ...prev[label], choice: c } }))}
                    style={{
                      padding: "4px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                      background: row.choice === c ? "#1a3a2a" : "#fff",
                      color: row.choice === c ? "#fff" : "#2b3a52",
                      border: `1px solid ${row.choice === c ? "#1a3a2a" : "#dce1e8"}`,
                      fontWeight: row.choice === c ? 700 : 400,
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            <textarea
              value={row.note}
              onChange={(e) => setRows((prev) => ({ ...prev, [label]: { ...prev[label], note: e.target.value } }))}
              placeholder={label.includes("骨子") ? "銘柄・時期・損失額・行動の事実を記入（AIは改変しません）" : "補足・コメント（任意）"}
              rows={label.includes("骨子") || label.includes("どうするか") ? 5 : 3}
              style={{ width: "100%", borderRadius: 7, border: "1px solid #dce1e8", padding: "10px 12px", fontSize: 16, color: "#2b3a52", resize: "vertical", fontFamily: "sans-serif", boxSizing: "border-box", lineHeight: 1.6 }}
            />
          </div>
        );
      })}

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#991b1b" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={save}
          disabled={saving}
          style={{ flex: 1, background: "#1a3a2a", color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontSize: 15, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, minHeight: 50 }}
        >
          {saving ? "保存中…" : saved ? "保存しました ✓" : "保存"}
        </button>

        <button
          onClick={approve}
          disabled={approving || !allFilled}
          title={!allFilled ? "全スロットを入力して保存してください" : ""}
          style={{ flex: 1, background: allFilled ? "#0f766b" : "#dce1e8", color: allFilled ? "#fff" : "#697587", border: "none", borderRadius: 10, padding: "13px 0", fontSize: 15, fontWeight: 600, cursor: allFilled && !approving ? "pointer" : "not-allowed", opacity: approving ? 0.6 : 1, minHeight: 50 }}
        >
          {approving ? "処理中…" : "承認"}
        </button>
      </div>

      {!allFilled && slots.length > 0 && (
        <div style={{ fontSize: 11, color: "#9ba8b5" }}>
          ※ 全スロットを入力・保存後に承認できます
        </div>
      )}
    </div>
  );
}
