/**
 * POST /api/articles/[id]/approve
 * 体験スロット充足チェック後、status → 'approved'
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articles, experiences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTemplate } from "@/lib/templates";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const [article] = await db.select().from(articles).where(eq(articles.id, id));
  if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });

  if (article.status === "published") {
    return NextResponse.json({ error: "Already published" }, { status: 409 });
  }

  const tmpl = getTemplate(article.template);
  if (tmpl && tmpl.experienceSlots.length > 0) {
    const exps = await db
      .select()
      .from(experiences)
      .where(eq(experiences.articleId, id));

    const missing = tmpl.experienceSlots.filter((slot) => {
      const found = exps.find((e) => e.label === slot && e.completed);
      return !found;
    });

    if (missing.length > 0) {
      return NextResponse.json(
        { error: "体験スロットが未充足です", missing },
        { status: 422 }
      );
    }
  }

  await db.update(articles).set({ status: "approved" }).where(eq(articles.id, id));
  return NextResponse.json({ status: "approved" });
}
