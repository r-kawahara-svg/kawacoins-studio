/**
 * 認証ヘルパー
 *
 * isBypassEnabled()      — DEV_AUTH_BYPASS=true かつ NODE_ENV!=='production' のときだけ true。
 * isSitePasswordMode()   — NODE_ENV==='production' かつ SITE_PASSWORD が設定されているとき true。
 * getCurrentUser()       — バイパス時はダミーユーザー、SITE_PASSWORD時もダミーユーザー（proxy.ts通過済みを信頼）、
 *                          それ以外は Supabase から取得。
 *
 * サーバー専用モジュール（process.env の秘密値を参照するため、クライアントに渡さないこと）。
 */
import type { User } from "@supabase/supabase-js";
import { isSitePasswordMode } from "@/lib/site-auth";

export { isSitePasswordMode };

/** バイパスが有効かどうか。本番では絶対に false になる二重ガード付き。 */
export function isBypassEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.DEV_AUTH_BYPASS === "true";
}

/** バイパス / SITE_PASSWORD モード時に返すダミーユーザー。 */
function dummyUser(): Partial<User> {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    email: process.env.ALLOWED_EMAIL ?? "admin@kawacoins.com",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  };
}

/**
 * 現在のログインユーザーを返す。
 * バイパス有効時         → ダミーユーザー
 * SITE_PASSWORD モード時 → 認証Cookieを検証し、有効ならダミーユーザー、無効/未認証なら null
 * 通常時（Supabase）     → Supabase auth.getUser() の結果
 */
export async function getCurrentUser(): Promise<Partial<User> | null> {
  if (isBypassEnabled()) return dummyUser();

  // 合言葉モード: 認証Cookieを実際に検証する（未認証なら null＝サイドバー等を出さない）
  if (isSitePasswordMode()) {
    const { cookies } = await import("next/headers");
    const { COOKIE_NAME, makeAuthToken } = await import("@/lib/site-auth");
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    if (token && token === await makeAuthToken(process.env.SITE_PASSWORD!)) {
      return dummyUser();
    }
    return null;
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
