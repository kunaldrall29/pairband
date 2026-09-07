import type { CSSProperties, ReactNode } from "react";
import { tokens } from "../tokens.js";
import { networkBadgeLabel, networkBadgeStyle, type NetworkBadgeProps } from "./states.js";

const navItems = [
  { href: "/protect", label: "Protect" },
  { href: "/earn", label: "Earn" },
  { href: "/markets", label: "Markets" },
  { href: "/portfolio", label: "Portfolio" },
] as const;

export type AppShellProps = {
  mode: NetworkBadgeProps["mode"];
  activePath?: string;
  wrongNetwork?: boolean;
  chainId?: number | null;
  walletSlot?: ReactNode;
  children: ReactNode;
  title?: string;
};

export function appShellCss(): string {
  return `
.pb-shell { display: flex; min-height: 100vh; background: var(--pb-canvas, ${tokens.canvas}); color: var(--pb-text, ${tokens.text}); font-family: var(--font-body, ${tokens.fonts.body}); }
.pb-sidebar { width: ${tokens.sidebarWidthPx}px; flex-shrink: 0; border-right: 1px solid ${tokens.border}; background: ${tokens.surface}; padding: 24px 16px; display: none; flex-direction: column; gap: 8px; }
.pb-brand { font-family: var(--font-display, ${tokens.fonts.heading}); font-size: 1.35rem; font-weight: 700; color: ${tokens.text}; text-decoration: none; margin-bottom: 16px; }
.pb-nav a { display: block; padding: 10px 12px; border-radius: 10px; color: ${tokens.muted}; text-decoration: none; font-weight: 600; }
.pb-nav a[aria-current="page"] { background: ${tokens.softHighlight}; color: ${tokens.text}; }
.pb-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.pb-topbar { height: ${tokens.topBarHeightPx}px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 24px; border-bottom: 1px solid ${tokens.border}; background: rgba(255,255,255,0.72); backdrop-filter: blur(8px); position: sticky; top: 0; z-index: 10; }
.pb-workspace { padding: 24px; max-width: 1120px; width: 100%; margin: 0 auto; }
.pb-mobile-nav { position: fixed; left: 0; right: 0; bottom: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border-top: 1px solid ${tokens.border}; background: ${tokens.surface}; padding: 8px 4px calc(8px + env(safe-area-inset-bottom)); z-index: 20; }
.pb-mobile-nav a { text-align: center; text-decoration: none; color: ${tokens.muted}; font-size: 12px; font-weight: 600; padding: 8px 4px; }
.pb-mobile-nav a[aria-current="page"] { color: ${tokens.action}; }
.pb-shell { padding-bottom: 72px; }
@media (min-width: 900px) {
  .pb-sidebar { display: flex; }
  .pb-mobile-nav { display: none; }
  .pb-shell { padding-bottom: 0; }
  .pb-workspace { padding: 32px; }
}
@media (prefers-reduced-motion: reduce) {
  .pb-topbar { backdrop-filter: none; }
}
`;
}

/** Presentational helpers for React apps that prefer inline composition. */
export function shellLayoutStyles(): {
  shell: CSSProperties;
  sidebar: CSSProperties;
  topbar: CSSProperties;
  workspace: CSSProperties;
} {
  return {
    shell: { display: "flex", minHeight: "100vh", background: tokens.canvas, color: tokens.text },
    sidebar: {
      width: tokens.sidebarWidthPx,
      borderRight: `1px solid ${tokens.border}`,
      background: tokens.surface,
      padding: 24,
    },
    topbar: {
      height: tokens.topBarHeightPx,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      borderBottom: `1px solid ${tokens.border}`,
      background: tokens.surface,
    },
    workspace: { padding: 32, maxWidth: 1120, margin: "0 auto", width: "100%" },
  };
}

export { navItems, networkBadgeLabel, networkBadgeStyle };
