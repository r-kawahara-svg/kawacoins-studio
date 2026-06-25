import { db } from "@/db";
import { apiUsage } from "@/db/schema";
import { desc, gte, sql } from "drizzle-orm";
import { calcCostUsd } from "@/lib/track-usage";

export const dynamic = "force-dynamic";

const OP_LABELS: Record<string, string> = {
  generate_body:    "記事生成（本文）",
  generate_visuals: "記事生成（図表抽出）",
  generate_faq:     "記事生成（FAQ）",
  rewrite_body:     "書き直し（本文）",
  rewrite_visuals:  "書き直し（図表抽出）",
  rewrite_faq:      "書き直し（FAQ）",
  suggest:          "ネタ提案",
};

const OP_COLORS: Record<string, string> = {
  generate_body:    "#1a3a2a",
  generate_visuals: "#2b5c3a",
  generate_faq:     "#3d7a52",
  rewrite_body:     "#2b5c8c",
  rewrite_visuals:  "#3d7ab8",
  rewrite_faq:      "#5599cc",
  suggest:          "#b07d2e",
};

function fmtUsd(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(5)}`;
  return `$${usd.toFixed(4)}`;
}

function fmtJpy(usd: number, rate = 155): string {
  const jpy = usd * rate;
  return `¥${jpy.toFixed(2)}`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default async function CostsPage() {
  // 全レコード取得（多くても数千件なので全件OK）
  const rows = await db.select().from(apiUsage).orderBy(desc(apiUsage.createdAt));

  // 今月の開始日
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // 集計
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let monthInputTokens = 0;
  let monthOutputTokens = 0;

  const byOp: Record<string, { input: number; output: number; count: number }> = {};
  const byDay: Record<string, { input: number; output: number }> = {};

  for (const r of rows) {
    const inp = r.inputTokens ?? 0;
    const out = r.outputTokens ?? 0;
    totalInputTokens += inp;
    totalOutputTokens += out;

    const isThisMonth = r.createdAt && new Date(r.createdAt) >= monthStart;
    if (isThisMonth) {
      monthInputTokens += inp;
      monthOutputTokens += out;
    }

    const op = r.operation;
    if (!byOp[op]) byOp[op] = { input: 0, output: 0, count: 0 };
    byOp[op].input += inp;
    byOp[op].output += out;
    byOp[op].count += 1;

    const day = r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "unknown";
    if (!byDay[day]) byDay[day] = { input: 0, output: 0 };
    byDay[day].input += inp;
    byDay[day].output += out;
  }

  const totalCost = calcCostUsd("claude-sonnet-4-6", totalInputTokens, totalOutputTokens);
  const monthCost = calcCostUsd("claude-sonnet-4-6", monthInputTokens, monthOutputTokens);

  // 直近30日分のバーチャートデータ
  const days30: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days30.push(d.toISOString().slice(0, 10));
  }
  const dayCosts = days30.map(d => {
    const v = byDay[d];
    if (!v) return { day: d, cost: 0 };
    return { day: d, cost: calcCostUsd("claude-sonnet-4-6", v.input, v.output) };
  });
  const maxDayCost = Math.max(...dayCosts.map(d => d.cost), 0.0001);

  // 操作別集計をコスト降順でソート
  const opEntries = Object.entries(byOp).sort((a, b) => {
    const ca = calcCostUsd("claude-sonnet-4-6", a[1].input, a[1].output);
    const cb = calcCostUsd("claude-sonnet-4-6", b[1].input, b[1].output);
    return cb - ca;
  });

  // 操作別コスト合計（円グラフ用 %計算）
  const opCosts = opEntries.map(([op, v]) => ({
    op,
    cost: calcCostUsd("claude-sonnet-4-6", v.input, v.output),
    count: v.count,
    input: v.input,
    output: v.output,
  }));

  // 最近30件
  const recent = rows.slice(0, 30);

  return (
    <div style={{ padding: "20px 16px 60px", maxWidth: 960, margin: "0 auto" }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#697587", fontWeight: 600, fontFamily: "monospace", marginBottom: 16 }}>
        API費用モニター
      </div>

      {/* サマリーカード */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "累計費用", value: fmtUsd(totalCost), sub: fmtJpy(totalCost), color: "#161d2b" },
          { label: "今月費用", value: fmtUsd(monthCost), sub: fmtJpy(monthCost), color: "#1a3a2a" },
          { label: "累計呼び出し回数", value: `${rows.length}回`, sub: "", color: "#2b5c8c" },
          { label: "累計トークン（入力）", value: fmtTokens(totalInputTokens), sub: "", color: "#697587" },
          { label: "累計トークン（出力）", value: fmtTokens(totalOutputTokens), sub: "", color: "#697587" },
        ].map(c => (
          <div key={c.label} style={{ background: "#fff", border: "1px solid #dce1e8", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 2px rgba(22,29,43,.04)" }}>
            <div style={{ fontSize: 11, color: "#697587", fontWeight: 600, marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color, fontFamily: "monospace" }}>{c.value}</div>
            {c.sub && <div style={{ fontSize: 11.5, color: "#9ba8b5", marginTop: 2 }}>{c.sub} (155円換算)</div>}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start", marginBottom: 24 }}>
        {/* 日次コストバーチャート */}
        <div style={{ background: "#fff", border: "1px solid #dce1e8", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 2px rgba(22,29,43,.04)" }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#161d2b", marginBottom: 14 }}>日次コスト（直近30日）</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 100 }}>
            {dayCosts.map(({ day, cost }) => {
              const h = Math.max(Math.round((cost / maxDayCost) * 90), cost > 0 ? 2 : 0);
              const dateLabel = day.slice(5); // MM-DD
              return (
                <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }} title={`${day}: ${fmtUsd(cost)}`}>
                  <div style={{ width: "100%", background: cost > 0 ? "#1a3a2a" : "#f0f4f8", height: h, borderRadius: "2px 2px 0 0", minHeight: cost > 0 ? 2 : 0 }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 10, color: "#9ba8b5", fontFamily: "monospace" }}>{days30[0].slice(5)}</span>
            <span style={{ fontSize: 10, color: "#9ba8b5", fontFamily: "monospace" }}>{days30[29].slice(5)}</span>
          </div>
        </div>

        {/* 操作別コスト */}
        <div style={{ background: "#fff", border: "1px solid #dce1e8", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 2px rgba(22,29,43,.04)" }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#161d2b", marginBottom: 14 }}>操作別コスト</div>
          {opCosts.length === 0 ? (
            <div style={{ color: "#9ba8b5", fontSize: 13 }}>まだデータがありません</div>
          ) : opCosts.map(({ op, cost, count }) => {
            const pct = totalCost > 0 ? (cost / totalCost) * 100 : 0;
            const color = OP_COLORS[op] ?? "#697587";
            return (
              <div key={op} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: "#2b3a52", fontWeight: 600 }}>{OP_LABELS[op] ?? op}</span>
                  <span style={{ fontSize: 11.5, color: "#697587", fontFamily: "monospace" }}>{fmtUsd(cost)} ({count}回)</span>
                </div>
                <div style={{ background: "#f0f4f8", borderRadius: 4, height: 6 }}>
                  <div style={{ background: color, height: 6, borderRadius: 4, width: `${Math.max(pct, 1)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 最近の呼び出し */}
      <div style={{ background: "#fff", border: "1px solid #dce1e8", borderRadius: 12, boxShadow: "0 1px 2px rgba(22,29,43,.04)", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #dce1e8", fontWeight: 700, fontSize: 13.5, color: "#161d2b" }}>
          最近の呼び出し（{Math.min(rows.length, 30)}件 / 計{rows.length}件）
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: "28px 20px", color: "#9ba8b5", fontSize: 13, textAlign: "center" }}>
            まだ記録がありません。記事生成やネタ提案を実行すると記録されます。
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: "#f8faf9" }}>
                  {["日時", "操作", "入力tokens", "出力tokens", "コスト"].map(h => (
                    <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600, color: "#697587", borderBottom: "1px solid #dce1e8", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((r, i) => {
                  const cost = calcCostUsd("claude-sonnet-4-6", r.inputTokens ?? 0, r.outputTokens ?? 0);
                  const color = OP_COLORS[r.operation] ?? "#697587";
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f0f4f8", background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                      <td style={{ padding: "7px 14px", color: "#9ba8b5", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td style={{ padding: "7px 14px" }}>
                        <span style={{ background: color, color: "#fff", borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 600, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                          {r.operation}
                        </span>
                      </td>
                      <td style={{ padding: "7px 14px", fontFamily: "monospace", color: "#2b3a52" }}>{fmtTokens(r.inputTokens ?? 0)}</td>
                      <td style={{ padding: "7px 14px", fontFamily: "monospace", color: "#2b3a52" }}>{fmtTokens(r.outputTokens ?? 0)}</td>
                      <td style={{ padding: "7px 14px", fontFamily: "monospace", fontWeight: 600, color: "#161d2b" }}>{fmtUsd(cost)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
