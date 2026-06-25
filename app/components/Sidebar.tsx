"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/actions/auth";

const NAV = [
  {
    label: "ダッシュボード",
    href: "/",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    label: "ネタキュー",
    href: "/topics",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <circle cx="3" cy="6" r="1" fill="currentColor" stroke="none" />
        <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="3" cy="18" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "レビュー",
    href: "/review",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    label: "アフィリ",
    href: "/affiliates",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
];

interface Props {
  bypass: boolean;
}

export function Sidebar({ bypass }: Props) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // ── デスクトップ サイドバー ───────────────────────────────
  const DesktopSidebar = () => (
    <aside className="sidebar-desktop" style={{
      width: 220, background: "#161d2b", display: "flex",
      flexDirection: "column", minHeight: "100dvh", flexShrink: 0,
    }}>
      <Logo />
      <NavLinks />
      <Footer />
    </aside>
  );

  // ── モバイル ハンバーガー + ドロワー ────────────────────
  const MobileTopBar = () => (
    <div className="sidebar-mobile-bar" style={{
      background: "#161d2b", display: "flex", alignItems: "center",
      minHeight: 52, padding: "0 16px", gap: 12,
      position: "sticky", top: 0, zIndex: 30,
    }}>
      <button
        onClick={() => setDrawerOpen(true)}
        aria-label="メニュー"
        style={{ background: "none", border: "none", color: "#aeb8c8", cursor: "pointer", padding: 8, display: "flex", alignItems: "center" }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <span style={{ color: "#fff", fontWeight: 800, fontSize: 15, fontFamily: "monospace" }}>記事スタジオ</span>
    </div>
  );

  // ── モバイル ボトムタブバー ──────────────────────────────
  const BottomTabBar = () => (
    <nav className="bottom-tab-bar">
      {NAV.map(item => {
        const active = isActive(item.href);
        return (
          <a key={item.href} href={item.href} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 4, padding: "8px 4px",
            color: active ? "#0f766b" : "#8b9ab0",
            textDecoration: "none", minHeight: 52,
          }}>
            <span style={{ opacity: active ? 1 : 0.65 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, letterSpacing: "-0.01em" }}>
              {item.label}
            </span>
          </a>
        );
      })}
    </nav>
  );

  // ── ドロワー（モバイル左スライド） ──────────────────────
  const Drawer = () => (
    <>
      <div onClick={() => setDrawerOpen(false)} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 40,
      }} />
      <aside style={{
        position: "fixed", top: 0, left: 0, zIndex: 50,
        width: 240, background: "#161d2b", display: "flex",
        flexDirection: "column", minHeight: "100dvh",
      }}>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 14px" }}>
          <button onClick={() => setDrawerOpen(false)} style={{
            background: "none", border: "none", color: "#697587", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 6,
          }}>✕</button>
        </div>
        <Logo />
        <NavLinks onClick={() => setDrawerOpen(false)} />
        <Footer />
      </aside>
    </>
  );

  // ── 共通パーツ ───────────────────────────────────────────
  const Logo = () => (
    <div style={{ padding: "20px 20px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#0f766b" }} />
        <span style={{ color: "#fff", fontWeight: 800, fontSize: 14, fontFamily: "monospace" }}>記事スタジオ</span>
      </div>
      <div style={{ fontSize: 10, color: "#4a5568", fontFamily: "monospace", paddingLeft: 16 }}>kawacoins.com</div>
    </div>
  );

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav style={{ padding: "8px 12px", flex: 1 }}>
      {NAV.map(item => {
        const active = isActive(item.href);
        return (
          <a key={item.href} href={item.href} onClick={onClick} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "11px 10px", borderRadius: 9, marginBottom: 2,
            color: active ? "#fff" : "#8b9ab0",
            background: active ? "#0f766b" : "transparent",
            fontWeight: active ? 600 : 400, fontSize: 14,
            textDecoration: "none", minHeight: 44,
          }}>
            <span style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}>{item.icon}</span>
            {item.label}
          </a>
        );
      })}
    </nav>
  );

  const Footer = () => (
    <div style={{ padding: "12px 12px 20px", borderTop: "1px solid #232f42" }}>
      {bypass && (
        <div style={{ background: "#4c1d95", color: "#e9d5ff", fontSize: 10, fontWeight: 700, fontFamily: "monospace", padding: "4px 10px", borderRadius: 5, marginBottom: 10 }}>
          DEV: バイパス中
        </div>
      )}
      <form action={signOut}>
        <button type="submit" style={{
          display: "flex", alignItems: "center", gap: 8, color: "#556070",
          fontSize: 13, background: "none", border: "none", cursor: "pointer",
          padding: "8px 10px", borderRadius: 7, width: "100%", minHeight: 44,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {bypass ? "バイパス解除" : "ログアウト"}
        </button>
      </form>
    </div>
  );

  return (
    <>
      <DesktopSidebar />
      <MobileTopBar />
      <BottomTabBar />
      {drawerOpen && <Drawer />}
    </>
  );
}
