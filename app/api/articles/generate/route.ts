import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { topics, articles, judgments } from "@/db/schema";
import { eq } from "drizzle-orm";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topicId } = body as { topicId: string };

  if (!topicId) {
    return NextResponse.json({ error: "topicId required" }, { status: 400 });
  }

  // 1. Fetch topic
  const [topic] = await db.select().from(topics).where(eq(topics.id, topicId));
  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  // 2. Call Anthropic
  const systemPrompt = `あなたは個人投資家向けの金融記事ライターです。
以下のルールを厳守してください：
- 断定を避け投資助言にならない表現を使う（「〜と考えられる」「一例として」「〜の可能性がある」など）
- H2/H3 Markdown見出しを使って構造化する
- 本文中に必ず以下のプレースホルダーを各1回ずつ含める：
  [JUDGMENT:trade] - トレード判断の挿入箇所
  [JUDGMENT:position] - ポジション判断の挿入箇所
  [JUDGMENT:take] - テイク（利確・損切り）判断の挿入箇所
- アフィリエイトリンクの挿入箇所には [AFFILIATE:テーマ名] を適切な位置に配置する（複数可）
- 記事末尾は必ず「この記事はAIの下書きをもとに運営者が編集しています」で終わる
- 金融商品への投資は元本割れリスクがあることを適切に言及する`;

  const userPrompt = `以下のトピックについて投資家向けの記事を書いてください。

タイトル: ${topic.title}
カテゴリ: ${topic.source}
キーワード: ${topic.keyword ?? "なし"}
概要メモ: ${topic.summary ?? "なし"}
出典URL: ${topic.sourceUrl ?? "なし"}

3000文字程度の記事を作成し、[JUDGMENT:trade]、[JUDGMENT:position]、[JUDGMENT:take] を各1回必ず本文に含めてください。
また [AFFILIATE:テーマ] プレースホルダーも適切な位置に配置してください。`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const bodyMd = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  // Extract a title from the first H1/H2 or use topic title
  const titleMatch = bodyMd.match(/^#{1,2}\s+(.+)$/m);
  const articleTitle = titleMatch ? titleMatch[1] : topic.title;

  // 3. Save to DB
  const [article] = await db
    .insert(articles)
    .values({
      topicId: topic.id,
      title: articleTitle,
      bodyMd,
      aiModel: "claude-sonnet-4-6",
      status: "gate",
    })
    .returning();

  await db.insert(judgments).values({
    articleId: article.id,
    tradeView: null,
    position: null,
    uniqueTake: null,
    completed: false,
  });

  await db
    .update(topics)
    .set({ status: "drafted" })
    .where(eq(topics.id, topicId));

  return NextResponse.json({ articleId: article.id });
}
