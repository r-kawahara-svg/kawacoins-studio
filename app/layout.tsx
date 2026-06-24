import type { Metadata } from "next";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "記事スタジオ — kawacoins.com",
};

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col">
        {user && (
          <header style={{ background: "#161d2b" }} className="flex items-center gap-4 px-6 py-3 shrink-0">
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#0f766b", marginRight: 8 }} />
              記事スタジオ
            </span>
            <span style={{ color: "#7d889b", fontSize: 11, fontFamily: "monospace" }}>kawacoins.com</span>
            <nav className="flex gap-1 ml-4">
              <a href="/" style={{ color: "#aeb8c8", fontSize: 13, padding: "6px 12px", borderRadius: 7 }}>ダッシュボード</a>
              <a href="/topics" style={{ color: "#aeb8c8", fontSize: 13, padding: "6px 12px", borderRadius: 7 }}>ネタキュー</a>
              <a href="/affiliates" style={{ color: "#aeb8c8", fontSize: 13, padding: "6px 12px", borderRadius: 7 }}>アフィリ</a>
              <a href="/review" style={{ color: "#aeb8c8", fontSize: 13, padding: "6px 12px", borderRadius: 7 }}>レビュー</a>
            </nav>
            <div style={{ flex: 1 }} />
            <form action={signOut}>
              <button type="submit" style={{ color: "#7d889b", fontSize: 12, background: "none", border: "none", cursor: "pointer" }}>
                ログアウト
              </button>
            </form>
          </header>
        )}
        {children}
      </body>
    </html>
  );
}
