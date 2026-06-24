/**
 * GET /api/fix-affiliates — ALTERNA themes削除 + priority一括付与（冪等）
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { affiliatePrograms } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const all = await db
    .select({
      id: affiliatePrograms.id,
      name: affiliatePrograms.name,
      htmlSnippet: affiliatePrograms.htmlSnippet,
      adType: affiliatePrograms.adType,
    })
    .from(affiliatePrograms);

  const log: string[] = [];

  for (const row of all) {
    const isAlterna       = row.htmlSnippet.includes("45DXI8+B3HVOY+5PYG");
    const isMatsui主軸    = row.htmlSnippet.includes("45DXI8+B2WG36+3XCC+64C3M") ||
                             row.htmlSnippet.includes("451A36+Z4LGY+3XCC+BXQOI");
    const isBanner        = row.adType === "banner";

    const priority =
      isAlterna    ? 90 :
      isMatsui主軸 ? 10 :
      isBanner     ? 50 :
                     20;  // 通常 text（FX等）

    if (isAlterna) {
      await db.update(affiliatePrograms)
        .set({ priority, themes: [] })
        .where(eq(affiliatePrograms.id, row.id));
      log.push(`${row.name} [${row.adType}] → priority=${priority} themes=[]`);
    } else {
      await db.update(affiliatePrograms)
        .set({ priority })
        .where(eq(affiliatePrograms.id, row.id));
      log.push(`${row.name} [${row.adType}] → priority=${priority}`);
    }
  }

  const updated = await db
    .select({
      name: affiliatePrograms.name,
      adType: affiliatePrograms.adType,
      priority: affiliatePrograms.priority,
      themes: affiliatePrograms.themes,
    })
    .from(affiliatePrograms)
    .orderBy(affiliatePrograms.priority, affiliatePrograms.createdAt);

  return NextResponse.json({ log, updated });
}
