"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { ACTIVE_CHAIN } from "@pairband/config";

const nav = [
  { href: "/app", label: "Cash" },
  { href: "/app/pay", label: "Pay" },
  { href: "/app/convert", label: "Convert" },
  { href: "/app/activity", label: "Activity" },
  { href: "/app/workspace", label: "Workspace" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="banner">
        <div className="container">
          Rehearsal on Arc testnet ({ACTIVE_CHAIN.chainId}). Not mainnet. EURC routes hidden until a pool can fill.
        </div>
      </div>
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "rgba(246,241,232,0.92)",
          backdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "0.85rem 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <Link href="/" style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.15rem" }}>
              Pairband
            </Link>
            <nav style={{ display: "flex", gap: "0.35rem" }}>
              {nav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      padding: "0.45rem 0.85rem",
                      borderRadius: 999,
                      fontWeight: 600,
                      fontSize: "0.92rem",
                      background: active ? "var(--ink)" : "transparent",
                      color: active ? "var(--canvas)" : "var(--muted)",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <WalletButton />
        </div>
      </header>
      <main className="container" style={{ flex: 1, padding: "2rem 0 3.5rem", width: "min(880px, calc(100% - 2.5rem))" }}>
        {children}
      </main>
    </div>
  );
}

function WalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    return (
      <button
        className="btn btn-primary"
        style={{ padding: "0.55rem 1rem" }}
        disabled={isPending}
        onClick={() => connect({ connector: connectors[0]! })}
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  const wrong = chainId !== ACTIVE_CHAIN.chainId;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: "min(100%, 42rem)" }}>
      {wrong ? (
        <button
          className="btn btn-secondary"
          style={{ padding: "0.45rem 0.85rem" }}
          onClick={() => switchChain({ chainId: ACTIVE_CHAIN.chainId })}
        >
          Switch to Arc testnet
        </button>
      ) : (
        <div style={{ textAlign: "right", lineHeight: 1.25, minWidth: 0 }}>
          <div className="muted" style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.04em" }}>
            CONNECTED PAYER
          </div>
          <div
            title={address}
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "0.78rem",
              fontWeight: 600,
              wordBreak: "break-all",
            }}
          >
            {address}
          </div>
        </div>
      )}
      <button className="btn btn-secondary" style={{ padding: "0.45rem 0.85rem", flexShrink: 0 }} onClick={() => disconnect()}>
        Disconnect
      </button>
    </div>
  );
}
