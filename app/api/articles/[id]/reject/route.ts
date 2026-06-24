/**
 * POST /api/articles/[id]/reject
 * Body: { memo?: string }
 * status → 'rejected'（修正依頼の場合は 'draft' へ戻す）
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { revise?: boolean; memo?: string };

  const [article] = await db.select({ id: articles.id }).from(articles).where(eq(articles.id, id));
  if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });

  // revise=true → draft 差し戻し。それ以外は rejected
  const nextStatus = body.revise ? "draft" : "rejected";

  await db.update(articles).set({ status: nextStatus }).where(eq(articles.id, id));
  return NextResponse.json({ status: nextStatus, memo: body.memo ?? null });
}
