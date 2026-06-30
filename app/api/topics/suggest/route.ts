import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { trackUsage } from "@/lib/track-usage";

const client = new Anthropic();

export interface TopicSuggestion {
  title: string;
  template: "T1" | "T2" | "T3" | "T4" | "T5" | "T6";
  keyword: string;
  summary: string;
  required_experience: string;
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
                title: { type: "string", description: "記事タイトル（32字以内）。下記の多様なタイトル型から提案ごとに別の型を使う。年号は鮮度が効く時だけ" },
                template: { type: "string", enum: ["T1", "T2", "T3", "T4", "T5", "T6"], description: "T1=体験レビュー(最優先), T5=失敗談(最優先), T2=比較, T3=始め方, T4=決算個別株, T6=制度解説。一次体験で差別化できるT1/T5を優先する" },
                keyword: { type: "string", description: "SEOメインキーワード（20字以内）" },
                summary: { type: "string", description: "記事の切り口・強み（60字以内）" },
                required_experience: { type: "string", description: "この記事に必要なあなたの一次体験を具体的に（例:実際に保有した銘柄と保有期間/失敗した金額と状況/サービスの使用感）。体験が主役のT1/T5は必須レベルで具体的に書く" },
                revenue_score: { type: "number", description: "収益化ポテンシャル1〜5。アフィリエイト成約に繋がるほど高い" },
                source: { type: "string", enum: ["earnings", "news", "market", "idea"], description: "earnings=決算, news=ニュース, market=市況, idea=解説" },
              },
              required: ["title", "template", "keyword", "summary", "required_experience", "revenue_score", "source"],
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

以下の方針で投資ブログ記事のネタを3つ提案してください:

【最重要：一次体験で差別化】
大手メディアに埋もれないため、筆者の「一次体験」が主役になるネタを優先する。
- 3つのうち少なくとも2つは T1(体験レビュー) または T5(失敗談) にする。
- 比較(T2)/解説(T3,T6)を出す場合も、「自分の体験・実運用を混ぜる前提」のテーマにする。
- 各提案には required_experience に「この記事で必要なあなたの一次体験」を具体的に書く
  （実際の保有銘柄・損失額・使用感など。これが書けないネタは提案しない）。
- revenue_scoreは: 口座開設/iDeCo/NISAに繋がる=5, 商品紹介=4, 情報系=2〜3

【タイトルの型（最重要・3つで別々の型を使い、ワンパターンを避ける）】
毎回「○○年版〜徹底比較！」のような同じ型にしないこと。以下から選んで型を散らす:
1. 数字提示型: 「新NISAで初心者がやりがちな5つの失敗」
2. 問いかけ型: 「iDeCo、本当に得なの？50代から始める価値を考えた」
3. 対決・比較型: 「村田製作所とTDK、買うならどっち？」
4. 一人称・実体験型: 「個別株で200万円溶かして学んだ3つの教訓」
5. 逆説・意外型: 「NISAで“損する人”に共通すること」
6. ハウツー型: 「ゼロから分かる新NISAの始め方」
7. 期限・緊急型: 「改正前にやるべきiDeCoの設定」
8. ベネフィット提示型: 「月1万円で始める、ほったらかし投資」

ルール:
- 年号(${currentYear}年)はそれが本当に鮮度・意味を持つ時だけ付ける。全タイトルに付けない。
- 「徹底比較」「完全ガイド」等の決まり文句を3つ全部に使わない。多くて1つまで。
- 誇大表現（絶対儲かる/必ず等）は使わない。読者の具体的な悩み・状況が浮かぶ言葉にする。`,
    }],
  });

  void trackUsage({ operation: "suggest", model: "claude-sonnet-4-6", inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens });

  const toolUse = message.content.find(b => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json({ error: "提案の生成に失敗しました" }, { status: 500 });
  }

  const { suggestions } = toolUse.input as { suggestions: TopicSuggestion[] };
  return NextResponse.json({ suggestions });
}
