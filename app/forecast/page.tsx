import Anthropic from "@anthropic-ai/sdk";
import { listWpPosts } from "@/lib/wp";
import { getTrafficTrend } from "@/lib/analytics";
import { trackUsage } from "@/lib/track-usage";
import { PaceForm } from "./PaceForm";

export const dynamic = "force-dynamic";

interface Milestone { label: string; monthlyPv: number; adsenseYen: number; a8Yen: number; totalYen: number; note: string }
interface Forecast { assumptions: string[]; milestones: Milestone[]; summary: string; caveats: string[] }

async function buildForecast(input: {
  publishedCount: number; pacePerMonth: number; monthlyPv: number; trendPct: number | null;
}): Promise<Forecast | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `あなたは投資・金融ジャンルのブログ収益化に詳しいアナリストです。
以下の現状から、このペースで運営を続けた場合の収益を「一般的な目安」で予想してください。

【現状】
- 公開記事数: ${input.publishedCount}本
- 投稿ペース: 月あたり約${input.pacePerMonth}本
- 現在の月間PV: 約${input.monthlyPv}PV
- 直近の流入トレンド: ${input.trendPct == null ? "不明" : `${input.trendPct}%`}

【予想の前提（一般的なベンチマーク・必要に応じ調整可）】
- 投資/金融ジャンルのAdSense RPMは概ね300〜700円/1000PV（CPCが高め）。
- A8.net等のアフィリは証券口座開設・NISA・iDeCoで単価が高い（1成約2,000〜15,000円）が、成約率はPVの0.05〜0.3%程度。
- 新規記事はSEOで評価されるまで3〜6ヶ月かかり、記事数の蓄積でPVは逓増する。
- 過度に楽観/悲観にしない。控えめ〜中庸の現実的な数字にする。

次のJSONのみ返す（円は整数、PVは整数）:
{
  "assumptions": ["採用した前提を3〜5個（RPM・成約率・成長率など具体値で）"],
  "milestones": [
    {"label":"3ヶ月後","monthlyPv":数値,"adsenseYen":数値,"a8Yen":数値,"totalYen":数値,"note":"一言"},
    {"label":"6ヶ月後", ...},
    {"label":"12ヶ月後", ...},
    {"label":"24ヶ月後", ...}
  ],
  "summary": "いつ頃から月いくらくらいになりそうか、2〜3文で総括",
  "caveats": ["不確実性・前提が崩れる要因を2〜3個"]
}`,
      }],
    });
    void trackUsage({ operation: "revenue_forecast", model: "claude-sonnet-4-6", inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens });
    const text = msg.content.filter(b => b.type === "text").map(b => (b as { text: string }).text).join("").trim();
    const json = text.match(/\{[\s\S]*\}/);
    return json ? JSON.parse(json[0]) as Forecast : null;
  } catch {
    return null;
  }
}

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;

export default async function ForecastPage({ searchParams }: { searchParams: Promise<{ pace?: string }> }) {
  const sp = await searchParams;

  let posts: Awaited<ReturnType<typeof listWpPosts>> = [];
  try { posts = await listWpPosts(); } catch { /* WP未設定 */ }
  const published = posts.filter(p => p.status === "publish");

  // 実績の投稿ペース（直近90日の公開数 ÷ 3）
  const now = Date.now();
  const d90 = published.filter(p => p.date && (now - new Date(p.date).getTime()) < 90 * 864e5).length;
  const autoPace = Math.max(0, Math.round((d90 / 3) * 10) / 10);

  // 入力されたペースがあればそれを使う（無ければ実績ペース）
  const paceInput = sp.pace != null && sp.pace !== "" ? Number(sp.pace) : NaN;
  const pacePerMonth = Number.isFinite(paceInput) && paceInput >= 0 ? paceInput : autoPace;
  const isCustomPace = pacePerMonth !== autoPace;

  const trend = await getTrafficTrend(28);
  const monthlyPv = trend.configured ? Math.round(trend.current.views * 30 / 28) : 0;
  const trendPct = trend.previous.views > 0
    ? Math.round(((trend.current.views - trend.previous.views) / trend.previous.views) * 100)
    : null;

  const forecast = await buildForecast({
    publishedCount: published.length, pacePerMonth, monthlyPv, trendPct,
  });

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e3e6ea", borderRadius: 14 };

  return (
    <div style={{ padding: "20px 16px 60px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9aa3af", fontWeight: 600, fontFamily: "monospace", marginBottom: 12 }}>
        収益予想
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1f2937", margin: "0 0 6px" }}>
        収益予想（AdSense + A8.net）
      </h1>
      <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px", lineHeight: 1.7 }}>
        現在の投稿ペースとアクセスから、このまま続けた場合の収益をAIが一般的な目安で予想します。
      </p>

      {/* 現状サマリ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "公開記事数", value: `${published.length}本` },
          { label: isCustomPace ? "投稿ペース（仮定）" : "投稿ペース（実績）", value: `月 ${pacePerMonth}本` },
          { label: "現在の月間PV", value: trend.configured ? monthlyPv.toLocaleString() : "—" },
          { label: "流入トレンド", value: trendPct == null ? "—" : `${trendPct > 0 ? "+" : ""}${trendPct}%` },
        ].map(m => (
          <div key={m.label} style={{ ...card, padding: "14px 16px" }}>
            <div style={{ fontSize: 11.5, color: "#6b7280" }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "monospace", marginTop: 4, color: "#1f2937" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* 投稿ペース入力 */}
      <PaceForm defaultPace={pacePerMonth} autoPace={autoPace} />

      {!forecast ? (
        <div style={{ ...card, padding: "20px", color: "#8a6d2f", background: "#fbf6e9", fontSize: 13 }}>
          予想を生成できませんでした（ANTHROPIC_API_KEY 未設定、またはGA4のPVデータが必要です）。
        </div>
      ) : (
        <>
          {/* 予想タイムライン */}
          <div style={{ ...card, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #eef0f3", fontSize: 14, fontWeight: 700, color: "#1f2937" }}>
              収益予想タイムライン
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ color: "#6b7280", fontSize: 11.5, textAlign: "right" }}>
                    <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600 }}>時期</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600 }}>月間PV</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600 }}>AdSense</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600 }}>A8.net</th>
                    <th style={{ padding: "10px 16px", fontWeight: 600 }}>月合計</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.milestones.map((m, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #eef0f3" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "#1f2937" }}>
                        {m.label}
                        {m.note && <div style={{ fontSize: 11, fontWeight: 400, color: "#9aa3af", marginTop: 2 }}>{m.note}</div>}
                      </td>
                      <td style={{ padding: "12px", textAlign: "right", fontFamily: "monospace", color: "#374151" }}>{Math.round(m.monthlyPv).toLocaleString()}</td>
                      <td style={{ padding: "12px", textAlign: "right", fontFamily: "monospace", color: "#374151" }}>{yen(m.adsenseYen)}</td>
                      <td style={{ padding: "12px", textAlign: "right", fontFamily: "monospace", color: "#374151" }}>{yen(m.a8Yen)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: "#0f766b" }}>{yen(m.totalYen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 総括 */}
          {forecast.summary && (
            <div style={{ display: "flex", gap: 8, background: "#f1f7f5", border: "1px solid #cfe0dc", borderRadius: 12, padding: "14px 16px", fontSize: 13.5, color: "#37494f", lineHeight: 1.75, marginBottom: 20 }}>
              <span style={{ flexShrink: 0 }}>💬</span><span>{forecast.summary}</span>
            </div>
          )}

          {/* 前提・注意 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            <div style={{ ...card, padding: "14px 18px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", marginBottom: 8 }}>前提</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#4b5563", lineHeight: 1.8 }}>
                {forecast.assumptions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
            <div style={{ ...card, padding: "14px 18px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", marginBottom: 8 }}>注意・不確実性</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#4b5563", lineHeight: 1.8 }}>
                {forecast.caveats.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          </div>
        </>
      )}

      <p style={{ fontSize: 11, color: "#9aa3af", marginTop: 20, lineHeight: 1.7 }}>
        ※ これはAIによる一般的な目安の予想です。実際の収益はジャンル・検索順位・季節性・規約変更などで大きく変動します。投資判断・経営判断の保証ではありません。
      </p>
    </div>
  );
}
