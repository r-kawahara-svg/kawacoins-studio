import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface TopicSuggestion {
  title: string;
  template: "T1" | "T2" | "T3" | "T4" | "T5";
  keyword: string;
  summary: string;
  revenue_score: number;
  source: "earnings" | "news" | "market" | "idea";
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { keyword?: string };
  const { keyword } = body;
  if (!keyword?.trim()) {
    return NextResponse.json({ error: "キーワードを入力してください" }, { status: 400 });
  }

  const currentYear = new Date().getFullYear();

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    tools: [{
      name: "suggest_topics",
      description: "投資ブログ記事のネタを3つ提案する",
      input_schema: {
        type: "object" as const,
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "記事タイトル（30字以内、${currentYear}年などの年号を入れて鮮度を出す）" },
                template: { type: "string", enum: ["T1", "T2", "T3", "T4", "T5"], description: "T1=体験談/失敗, T2=比較, T3=決算解説, T4=市況/マクロ, T5=初心者ガイド" },
                keyword: { type: "string", description: "SEOメインキーワード（20字以内）" },
                summary: { type: "string", description: "記事の切り口・強み（60字以内）" },
                revenue_score: { type: "number", description: "収益化ポテンシャル1〜5。アフィリエイト成約に繋がるほど高い" },
                source: { type: "string", enum: ["earnings", "news", "market", "idea"], description: "earnings=決算, news=ニュース, market=市況, idea=解説" },
              },
              required: ["title", "template", "keyword", "summary", "revenue_score", "source"],
            },
            minItems: 3,
            maxItems: 3,
          },
        },
        required: ["suggestions"],
      },
    }],
    tool_choice: { type: "tool", name: "suggest_topics" },
    messages: [{
      role: "user",
      content: `現在年: ${currentYear}年。キーワード:「${keyword}」

以下の観点で投資ブログ記事のネタを3つ提案してください:
- 体験談・失敗談・比較・決算分析など成約率が高い切り口を優先
- 年号は${currentYear}年を使い古い情報にしない
- 3つはそれぞれ異なるテンプレート(T1〜T5)・切り口にする
- アフィリエイト（証券口座開設等）への自然な誘導ができるテーマを優先
- revenue_scoreは: 口座開設/iDeCo/NISAに繋がる=5, 商品紹介=4, 情報系=2〜3`,
    }],
  });

  const toolUse = message.content.find(b => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json({ error: "提案の生成に失敗しました" }, { status: 500 });
  }

  const { suggestions } = toolUse.input as { suggestions: TopicSuggestion[] };
  return NextResponse.json({ suggestions });
}
