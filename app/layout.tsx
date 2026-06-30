import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getCurrentUser, isBypassEnabled } from "@/lib/auth";
import { Sidebar } from "@/app/components/Sidebar";

export const metadata: Metadata = {
  // ログイン前にも見えるタブ名は固有名を出さない（共有先に内容が分からないように）
  title: "実験用",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "実験用",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#161d2b",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const bypass = isBypassEnabled();

  return (
    <html lang="ja" className="h-full">
      <head>
        {/* SW登録 */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
        ` }} />
      </head>
      <body style={{ minHeight: "100dvh", background: "#e9ecf0", color: "#161d2b", fontFamily: "'Inter', 'Noto Sans JP', sans-serif", overflowX: "hidden" }}>
        {user ? (
          <div className="app-shell">
            <Sidebar bypass={bypass} />
            <main className="app-main">
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
