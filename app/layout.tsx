import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser, isBypassEnabled } from "@/lib/auth";
import { Sidebar } from "@/app/components/Sidebar";

export const metadata: Metadata = {
  title: "記事スタジオ — kawacoins.com",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const bypass = isBypassEnabled();

  return (
    <html lang="ja" className="h-full">
      <body style={{ minHeight: "100vh", background: "#e9ecf0", color: "#161d2b", fontFamily: "'Inter', 'Noto Sans JP', sans-serif" }}>
        {user ? (
          <div style={{ display: "flex", minHeight: "100vh" }}>
            <Sidebar bypass={bypass} />
            <main style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
              {children}
            </main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
