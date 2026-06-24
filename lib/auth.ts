/**
 * 認証ヘルパー
 *
 * isBypassEnabled() — DEV_AUTH_BYPASS=true かつ NODE_ENV!=='production' のときだけ true。
 * getCurrentUser()  — バイパス時はダミーユーザーを返す。それ以外は Supabase から取得。
 *
 * サーバー専用モジュール（process.env の秘密値を参照するため、クライアントに渡さないこと）。
 */
import type { User } from "@supabase/supabase-js";

/** バイパスが有効かどうか。本番では絶対に false になる二重ガード付き。 */
export function isBypassEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.DEV_AUTH_BYPASS === "true";
}

/** バイパス時に返すダミーユーザー。ALLOWED_EMAIL をそのまま使う。 */
function bypassUser(): Partial<User> {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    email: process.env.ALLOWED_EMAIL ?? "dev@localhost",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  };
}

/**
 * 現在のログインユーザーを返す。
 * バイパス有効時 → ダミーユーザー
 * 通常時        → Supabase auth.getUser() の結果
 */
export async function getCurrentUser(): Promise<Partial<User> | null> {
  if (isBypassEnabled()) return bypassUser();

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
