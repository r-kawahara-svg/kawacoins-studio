import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isBypassEnabled } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ① 開発バイパス（DEV_AUTH_BYPASS=true かつ非本番のみ）
  if (isBypassEnabled()) {
    // /login にアクセスしたら / へ転送（ログイン不要なので）
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next({ request });
  }

  // ② APIルート・authルートはセッション更新不要でスルー
  if (pathname.startsWith("/api/") || pathname.startsWith("/auth/")) {
    return NextResponse.next({ request });
  }

  // ③ 通常の Supabase 認証チェック
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
