import { db } from "@/db";
import { apiUsage } from "@/db/schema";

// 料金表 $/1M tokens (2026年6月時点)
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5":          { input: 1.0,  output: 5.0  },
  "claude-haiku-4-5-20251001": { input: 1.0,  output: 5.0  },
  "claude-sonnet-4-6":         { input: 3.0,  output: 15.0 },
  "claude-sonnet-4-5":         { input: 3.0,  output: 15.0 },
  "claude-opus-4-6":           { input: 5.0,  output: 25.0 },
  "claude-opus-4-8":           { input: 5.0,  output: 25.0 },
};

export function calcCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  // 日付サフィックス付きモデルID → 正規化
  const normalized = model.replace(/-\d{8}$/, "");
  const p = PRICING[model] ?? PRICING[normalized] ?? PRICING["claude-sonnet-4-6"];
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

export async function trackUsage(params: {
  operation: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  articleId?: string | null;
}) {
  try {
    await db.insert(apiUsage).values({
      operation: params.operation,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      articleId: params.articleId ?? null,
    });
  } catch (e) {
    // コスト計測の失敗で本処理を止めない
    console.warn("[track-usage] insert failed:", e instanceof Error ? e.message : e);
  }
}
