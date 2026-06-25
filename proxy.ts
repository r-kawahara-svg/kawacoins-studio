import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isBypassEnabled } from "@/lib/auth";
import { isSitePasswordMode, makeAuthToken, COOKIE_NAME } from "@/lib/site-auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ① 開発バイパス（DEV_AUTH_BYPASS=true かつ非本番のみ）
  if (isBypassEnabled()) {
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next({ request });
  }

  // ② 合言葉パスワード認証（本番かつ SITE_PASSWORD が設定されているとき）
  if (isSitePasswordMode()) {
    // パスワード認証 API 自体はスルー（Cookie発行エンドポイント）
    if (pathname.startsWith("/api/auth/") || pathname.startsWith("/auth/")) {
      return NextResponse.next({ request });
    }

    const authCookie = request.cookies.get(COOKIE_NAME)?.value;

    if (!authCookie) {
      if (pathname === "/login") return NextResponse.next({ request });
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Cookie のトークンを検証（HMAC 再計算して比較）
    const expected = await makeAuthToken(process.env.SITE_PASSWORD!);
    if (authCookie !== expected) {
      // 不正または古いトークン → Cookie 削除してログインへ
      if (pathname === "/login") {
        const res = NextResponse.next({ request });
        res.cookies.delete(COOKIE_NAME);
        return res;
      }
      const res = NextResponse.redirect(new URL("/login", request.url));
      res.cookies.delete(COOKIE_NAME);
      return res;
    }

    // Cookie 有効 → /login にいるなら / へ転送
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next({ request });
  }

  // ③ APIルート・authルートはセッション更新不要でスルー（Supabase フロー）
  if (pathname.startsWith("/api/") || pathname.startsWith("/auth/")) {
    return NextResponse.next({ request });
  }

  // ④ 通常の Supabase 認証チェック
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (user && user.email !== process.env.ALLOWED_EMAIL) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
