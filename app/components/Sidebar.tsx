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
        label: "アクセス解析",
        href: "/analytics",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
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
        label: "リライト",
        href: "/rewrite",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        ),
      },
    ],
  },
];

// ボトムタブバー用フラットリスト
const NAV = NAV_SECTIONS.flatMap(s => s.items);

// ─── 配色トークン（白基調・落ち着いたトーン）─────────────────
const C = {
  panel: "#ffffff",
  border: "#e8ebef",
  brand: "#1f2937",
  sub: "#9aa3af",
  itemText: "#5b6470",
  activeText: "#0f766b",
  activeBg: "#eef4f3",
  muted: "#8b94a3",
};

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
      width: 220, background: C.panel, borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", flexShrink: 0,
      position: "sticky", top: 0, alignSelf: "flex-start",
      height: "100dvh", overflowY: "auto",
    }}>
      <Logo />
      <NavLinks />
      <Footer />
    </aside>
  );

  // ── モバイル ハンバーガー + ドロワー ────────────────────
  const MobileTopBar = () => (
    <div className="sidebar-mobile-bar" style={{
      background: C.panel, borderBottom: `1px solid ${C.border}`,
      display: "flex", alignItems: "center",
      minHeight: 52, padding: "0 16px", gap: 12,
      position: "sticky", top: 0, zIndex: 30,
    }}>
      <button
        onClick={() => setDrawerOpen(true)}
        aria-label="メニュー"
        style={{ background: "none", border: "none", color: C.itemText, cursor: "pointer", padding: 8, display: "flex", alignItems: "center" }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <span style={{ color: C.brand, fontWeight: 800, fontSize: 15, fontFamily: "monospace" }}>実験用</span>
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
            color: active ? C.activeText : C.muted,
            textDecoration: "none", minHeight: 52,
          }}>
            <span style={{ opacity: active ? 1 : 0.7 }}>{item.icon}</span>
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
        position: "fixed", inset: 0, background: "rgba(31,41,55,.35)", zIndex: 40,
      }} />
      <aside style={{
        position: "fixed", top: 0, left: 0, zIndex: 50,
        width: 240, background: C.panel, borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column", minHeight: "100dvh",
      }}>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 14px" }}>
          <button onClick={() => setDrawerOpen(false)} style={{
            background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 6,
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
    <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", gap: 10 }}>
      {/* ブランドアイコン（ペン×グラフのモノグラム） */}
      <span style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: "linear-gradient(135deg,#0f766b 0%,#15937f 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 6px rgba(15,118,107,.28)",
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19V10" /><path d="M10 19V5" /><path d="M16 19v-6" />
          <path d="M20.5 4.5l-2.8 2.8" /><path d="M21 8V4h-4" />
        </svg>
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: C.brand, fontWeight: 800, fontSize: 14.5 }}>実験用</div>
        <div style={{ fontSize: 10.5, color: C.sub, fontFamily: "monospace" }}>kawacoins.com</div>
      </div>
    </div>
  );

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav style={{ padding: "8px 12px", flex: 1 }}>
      {NAV_SECTIONS.map((section, si) => (
        <div key={section.section} style={{ marginBottom: si < NAV_SECTIONS.length - 1 ? 8 : 0 }}>
          <div style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", color: C.sub,
            padding: "10px 10px 4px", fontFamily: "monospace",
          }}>
            {section.section}
          </div>
          {section.items.map(item => {
            const active = isActive(item.href);
            return (
              <a key={item.href} href={item.href} onClick={onClick} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 10px", borderRadius: 9, marginBottom: 1,
                color: active ? C.activeText : C.itemText,
                background: active ? C.activeBg : "transparent",
                fontWeight: active ? 700 : 500, fontSize: 13.5,
                textDecoration: "none", minHeight: 42,
                transition: "background 0.12s, color 0.12s",
              }}>
                <span style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </a>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const Footer = () => (
    <div style={{ padding: "12px 12px 20px", borderTop: `1px solid ${C.border}` }}>
      {bypass && (
        <div style={{ background: "#f3eaff", color: "#7c3aed", fontSize: 10, fontWeight: 700, fontFamily: "monospace", padding: "4px 10px", borderRadius: 5, marginBottom: 10 }}>
          DEV: バイパス中
        </div>
      )}
      <form action={signOut}>
        <button type="submit" style={{
          display: "flex", alignItems: "center", gap: 8, color: C.muted,
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
