/**
 * GET  /api/articles/[id]/experiences  — 体験入力一覧取得
 * POST /api/articles/[id]/experiences  — 体験入力保存（upsert by label）
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articles, experiences } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const rows = await db
    .select()
    .from(experiences)
    .where(eq(experiences.articleId, id));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as { label: string; choice?: string; note?: string; completed?: boolean };

  if (!body.label) {
    return NextResponse.json({ error: "label required" }, { status: 400 });
  }

  // Verify article exists
  const [article] = await db.select({ id: articles.id }).from(articles).where(eq(articles.id, id));
  if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });

  // Upsert by articleId + label
  const existing = await db
    .select({ id: experiences.id })
    .from(experiences)
    .where(and(eq(experiences.articleId, id), eq(experiences.label, body.label)));

  if (existing.length > 0) {
    const [updated] = await db
      .update(experiences)
      .set({
        choice: body.choice ?? null,
        note: body.note ?? null,
        completed: body.completed ?? false,
        updatedAt: new Date(),
      })
      .where(and(eq(experiences.articleId, id), eq(experiences.label, body.label)))
      .returning();
    return NextResponse.json(updated);
  }

  const [inserted] = await db
    .insert(experiences)
    .values({
      articleId: id,
      label: body.label,
      choice: body.choice ?? null,
      note: body.note ?? null,
      completed: body.completed ?? false,
    })
    .returning();
  return NextResponse.json(inserted, { status: 201 });
}
