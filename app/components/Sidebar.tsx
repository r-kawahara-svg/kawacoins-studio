"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/actions/auth";

const NAV_SECTIONS = [
  {
    section: "管理画面",
    items: [
      {
        label: "ダッシュボード",
        href: "/",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        ),
      },
      {
        label: "公開済み",
        href: "/published",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        ),
      },
      {
        label: "アフィリ管理",
        href: "/affiliates",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        ),
      },
      {
        label: "API費用",
        href: "/costs",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "操作画面",
    items: [
      {
        label: "ネタ生成",
        href: "/topics",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        ),
      },
      {
        label: "編集画面",
        href: "/review",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        ),
      },
    ],
  },
];

// ボトムタブバー用フラットリスト
const NAV = NAV_SECTIONS.flatMap(s => s.items);

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
      {NAV_SECTIONS.map((section, si) => (
        <div key={section.section} style={{ marginBottom: si < NAV_SECTIONS.length - 1 ? 8 : 0 }}>
          <div style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#3d4f66",
            padding: "10px 10px 4px",
            fontFamily: "monospace",
          }}>
            {section.section}
          </div>
          {section.items.map(item => {
            const active = isActive(item.href);
            return (
              <a key={item.href} href={item.href} onClick={onClick} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 10px", borderRadius: 9, marginBottom: 1,
                color: active ? "#fff" : "#8b9ab0",
                background: active ? "#0f766b" : "transparent",
                fontWeight: active ? 600 : 400, fontSize: 13.5,
                textDecoration: "none", minHeight: 42,
                transition: "background 0.12s, color 0.12s",
              }}>
                <span style={{ opacity: active ? 1 : 0.65, flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </a>
            );
          })}
        </div>
      ))}
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
