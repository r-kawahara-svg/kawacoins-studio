import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { articles, topics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { trackUsage } from "@/lib/track-usage";

export const dynamic = "force-dynamic";

// X(Twitter)へコピペ投稿するための短文を生成（X APIは使わない）
export async function POST(req: NextRequest) {
  try {
    const { articleId } = await req.json() as { articleId?: string };
    if (!articleId) return NextResponse.json({ error: "articleId が必要です" }, { status: 400 });
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "ANTHROPIC_API_KEY 未設定" }, { status: 500 });

    const [article] = await db.select().from(articles).where(eq(articles.id, articleId));
    if (!article) return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });

    const keyword = article.topicId
      ? await db.select({ keyword: topics.keyword }).from(topics).where(eq(topics.id, article.topicId)).limit(1).then(r => r[0]?.keyword)
      : undefined;

    const base = process.env.WP_BASE_URL?.replace(/\/$/, "");
    const url = article.wpPostId && base ? `${base}/?p=${article.wpPostId}` : "（公開後にURLが入ります）";

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: `投資ブログ記事をXに投稿するための文章を1つ作ってください。

記事タイトル: ${article.title}
キーワード: ${keyword ?? "なし"}
本文の冒頭: ${article.bodyMd.replace(/\[[^\]]+\]/g, "").slice(0, 400)}
記事URL: ${url}

要件:
- 体験・失敗を匂わせる引きの一言 → 記事の要点 → 記事URL → ハッシュタグ の順。
- 全体で140字前後（URL・ハッシュタグ含め長すぎない）。
- ハッシュタグは記事内容に合うものを2〜3個（例: #投資 #NISA #新NISA #iDeCo #日本株 から適切に）。
- 煽りすぎ・誇大表現（必ず儲かる等）は禁止。URLはそのまま本文に含める。
- 投稿文そのものだけを返す（説明や引用符は不要）。`,
      }],
    });
    void trackUsage({ operation: "x_post", model: "claude-haiku-4-5", inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens, articleId });

    const text = msg.content.filter(b => b.type === "text").map(b => (b as { text: string }).text).join("").trim();
    return NextResponse.json({ ok: true, text });
  } catch (e) {
    console.error("[x-post] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
