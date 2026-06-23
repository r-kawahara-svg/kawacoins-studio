/**
 * E2E検証専用ルート（開発環境のみ使用。本番では呼ばれない想定）
 * GET  /api/e2e-verify?action=seed       → topicを1件作成してtopicIdを返す
 * GET  /api/e2e-verify?action=check&articleId=xxx → article/judgment の内容検証
 * DELETE /api/e2e-verify?topicId=xxx&articleId=xxx → E2Eレコードを削除
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { topics, articles, judgments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "seed") {
    try {
      const [topic] = await db.insert(topics).values({
        source: "earnings",
        title: "[E2E TEST] 藤倉電線 1Q決算：データセンター向け需要検証",
        summary: "E2Eテスト用。検証後に削除してください。",
        keyword: "藤倉電線 決算",
        revenueScore: 4,
        competition: "low",
        status: "new",
      }).returning();
      return NextResponse.json({ topicId: topic.id });
    } catch (e: unknown) {
      const err = e as { message?: string; cause?: { message?: string; code?: string } };
      return NextResponse.json({
        error: err.message,
        cause: err.cause?.message,
        code: err.cause?.code,
      }, { status: 500 });
    }
  }

  if (action === "check") {
    const articleId = searchParams.get("articleId")!;
    const [article] = await db.select().from(articles).where(eq(articles.id, articleId));
    const [judgment] = await db.select().from(judgments).where(eq(judgments.articleId, articleId));
    if (!article) return NextResponse.json({ error: "article not found" }, { status: 404 });
    return NextResponse.json({
      status: article.status,
      aiModel: article.aiModel,
      bodyLength: article.bodyMd.length,
      hasTradeJudgment:    article.bodyMd.includes("[JUDGMENT:trade]"),
      hasPositionJudgment: article.bodyMd.includes("[JUDGMENT:position]"),
      hasTakeJudgment:     article.bodyMd.includes("[JUDGMENT:take]"),
      hasAffiliate:        /\[AFFILIATE:[^\]]+\]/.test(article.bodyMd),
      hasDisclosure:       article.bodyMd.includes("AIの下書き"),
      judgment: judgment ? {
        completed:  judgment.completed,
        tradeView:  judgment.tradeView,
        position:   judgment.position,
        uniqueTake: judgment.uniqueTake,
      } : null,
    });
  }

  if (action === "fill-judgment") {
    const articleId = searchParams.get("articleId")!;
    await db.update(judgments).set({
      tradeView:  "自分はDC需要を半信半疑で、決算後の押し目だけ拾う方針。上げ初動は見送った。",
      position:   "現物100株を平均2,980で保有中。1Qは想定内で利確はしない。",
      uniqueTake: "受注残はDCより既存インフラ更新が主因では、という逆張り視点を持っている。",
      completed:  true,
    }).where(eq(judgments.articleId, articleId));
    return NextResponse.json({ ok: true });
  }

  if (action === "wp-verify") {
    const postId = searchParams.get("postId")!;
    const user = process.env.WP_USERNAME!;
    const pwd  = process.env.WP_APP_PASSWORD!;
    const b64  = Buffer.from(`${user}:${pwd}`).toString("base64");
    const wpRes = await fetch(
      `https://kawacoins.com/?rest_route=/wp/v2/posts/${postId}`,
      { headers: { Authorization: `Basic ${b64}` } }
    );
    if (!wpRes.ok) return NextResponse.json({ error: `WP GET ${wpRes.status}` }, { status: 502 });
    const post = await wpRes.json() as { content: { rendered: string }; title: { rendered: string }; status: string };
    const html = post.content.rendered;
    return NextResponse.json({
      title: post.title.rendered,
      wpStatus: post.status,
      hasJudgmentPlaceholder:  html.includes("[JUDGMENT:"),
      hasAffiliatePlaceholder: html.includes("[AFFILIATE:"),
      hasTradeText: html.includes("DC"), // tradeViewには"DC"が含まれる
    });
  }

  if (action === "wp-delete") {
    const postId = searchParams.get("postId")!;
    const user = process.env.WP_USERNAME!;
    const pwd  = process.env.WP_APP_PASSWORD!;
    const b64  = Buffer.from(`${user}:${pwd}`).toString("base64");
    const del = await fetch(
      `https://kawacoins.com/?rest_route=/wp/v2/posts/${postId}&force=true`,
      { method: "DELETE", headers: { Authorization: `Basic ${b64}` } }
    );
    return NextResponse.json({ status: del.status, ok: del.ok });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topicId   = searchParams.get("topicId");
  const articleId = searchParams.get("articleId");
  if (articleId) {
    await db.delete(judgments).where(eq(judgments.articleId, articleId));
    await db.delete(articles).where(eq(articles.id, articleId));
  }
  if (topicId) {
    await db.delete(topics).where(eq(topics.id, topicId));
  }
  return NextResponse.json({ ok: true });
}
