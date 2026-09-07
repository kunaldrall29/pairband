"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  appShellCss,
  navItems,
  networkBadgeLabel,
  networkBadgeStyle,
} from "@pairband/ui";
import { WalletMenu } from "./WalletMenu";

type Mode = "preview" | "testnet" | "mainnet";

export function AppShell({
  mode,
  children,
}: {
  mode: Mode;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  return (
    <div className="pb-shell">
      <style dangerouslySetInnerHTML={{ __html: appShellCss() }} />
      <aside className="pb-sidebar" aria-label="Primary">
        <Link href="/" className="pb-brand">
          Pairband
        </Link>
        <nav className="pb-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname.startsWith(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/activity" aria-current={pathname === "/activity" ? "page" : undefined}>
            Activity
          </Link>
          <Link href="/settings" aria-current={pathname === "/settings" ? "page" : undefined}>
            Settings
          </Link>
          <Link href="/status" aria-current={pathname === "/status" ? "page" : undefined}>
            Status
          </Link>
        </nav>
      </aside>
      <div className="pb-main">
        <header className="pb-topbar">
          <span style={networkBadgeStyle({ mode })}>{networkBadgeLabel({ mode })}</span>
          <WalletMenu mode={mode} />
        </header>
        <div className="pb-workspace">{children}</div>
      </div>
      <nav className="pb-mobile-nav" aria-label="Mobile primary">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname.startsWith(item.href) ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
