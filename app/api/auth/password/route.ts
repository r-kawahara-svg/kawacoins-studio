import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { makeAuthToken, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/site-auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { password?: string };
  const { password } = body;

  const expected = process.env.SITE_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "SITE_PASSWORD が設定されていません" }, { status: 500 });
  }
  if (!password) {
    return NextResponse.json({ error: "パスワードを入力してください" }, { status: 400 });
  }

  // タイミング攻撃対策（長さが違う場合も同じ時間がかかるよう比較）
  const passBuffer = Buffer.from(password);
  const expectedBuffer = Buffer.from(expected);
  let match = false;
  if (passBuffer.length === expectedBuffer.length) {
    try { match = timingSafeEqual(passBuffer, expectedBuffer); } catch { match = false; }
  }

  if (!match) {
    // ブルートフォース遅延（300ms）
    await new Promise(r => setTimeout(r, 300));
    return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });
  }

  const token = await makeAuthToken(expected);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}
