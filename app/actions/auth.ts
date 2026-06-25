"use server";

import { isBypassEnabled, isSitePasswordMode } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function signOut() {
  if (isSitePasswordMode()) {
    const { cookies } = await import("next/headers");
    const { COOKIE_NAME } = await import("@/lib/site-auth");
    (await cookies()).delete(COOKIE_NAME);
  } else if (!isBypassEnabled()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
