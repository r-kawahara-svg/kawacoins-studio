"use server";

import { db } from "@/db";
import { affiliatePrograms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function addAffiliate(formData: FormData) {
  const name = formData.get("name") as string;
  const asp = formData.get("asp") as string;
  const themesRaw = formData.get("themes") as string;
  const htmlSnippet = formData.get("html_snippet") as string;
  const payoutRaw = formData.get("payout") as string;

  // themes is a comma-separated string → parse to JSON array
  const themes = themesRaw
    ? themesRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const payout = payoutRaw ? parseInt(payoutRaw, 10) : null;

  await db.insert(affiliatePrograms).values({
    name,
    asp,
    themes,
    htmlSnippet,
    payout,
    active: true,
  });

  revalidatePath("/affiliates");
}

export async function toggleAffiliate(formData: FormData) {
  const id = formData.get("id") as string;
  const currentActive = formData.get("active") === "true";

  await db
    .update(affiliatePrograms)
    .set({ active: !currentActive })
    .where(eq(affiliatePrograms.id, id));

  revalidatePath("/affiliates");
}
