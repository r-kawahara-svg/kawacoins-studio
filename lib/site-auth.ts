/**
 * 合言葉パスワード認証ユーティリティ
 * WebCrypto HMAC-SHA256 — Edge ランタイム (proxy.ts) と Node.js API route の両方で動く。
 * Node.js の `crypto` モジュールには依存しない。
 */

export const COOKIE_NAME = "kawacoins-auth";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30日

/** SITE_PASSWORD が設定されており本番環境のときのみ true */
export function isSitePasswordMode(): boolean {
  return process.env.NODE_ENV === "production" && !!process.env.SITE_PASSWORD;
}

/**
 * HMAC-SHA256(key=sitePassword, data="kawacoins-studio-v1") → 小文字 hex 文字列
 * Cookie に保存するトークン値。パスワードそのものは格納しない。
 */
export async function makeAuthToken(sitePassword: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(sitePassword),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode("kawacoins-studio-v1")
  );
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
