import { tokens } from "@pairband/ui";
import { networkBadgeLabel } from "@pairband/ui";
import Link from "next/link";

type Mode = "preview" | "testnet" | "mainnet";

export function PublicHeader({ mode }: { mode: Mode }) {
  const primary =
    mode === "preview" ? { href: "#early-access", label: "Join early access" } : { href: "/protect", label: mode === "testnet" ? "Try the testnet app" : "Open app" };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        backdropFilter: "blur(8px)",
        background: "rgba(246,245,240,0.92)",
        borderBottom: `1px solid ${tokens.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "1.25rem",
            color: tokens.text,
            textDecoration: "none",
          }}
        >
          Pairband
        </Link>
        <nav
          aria-label="Public"
          style={{
            display: "none",
            gap: 20,
            alignItems: "center",
            fontWeight: 600,
            fontSize: 14,
          }}
          className="pb-public-nav"
        >
          <a href="#how-it-works" style={{ color: tokens.muted, textDecoration: "none" }}>
            How it works
          </a>
          <a href="#markets" style={{ color: tokens.muted, textDecoration: "none" }}>
            Markets
          </a>
          <a href="#risks" style={{ color: tokens.muted, textDecoration: "none" }}>
            Risks
          </a>
          <a
            href="https://github.com/kunaldrall29/pairband"
            style={{ color: tokens.muted, textDecoration: "none" }}
          >
            Docs
          </a>
        </nav>
        <a
          href={primary.href}
          style={{
            background: tokens.action,
            color: "#fff",
            textDecoration: "none",
            borderRadius: 12,
            padding: "10px 14px",
            fontWeight: 700,
            fontSize: 14,
            whiteSpace: "nowrap",
          }}
        >
          {primary.label}
        </a>
      </div>
      <div
        style={{
          textAlign: "center",
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 600,
          background: mode === "preview" ? "#FFF6E8" : tokens.softHighlight,
          color: tokens.text,
          borderTop: `1px solid ${tokens.border}`,
        }}
      >
        {networkBadgeLabel({ mode })}
      </div>
      <style>{`
        @media (min-width: 820px) {
          .pb-public-nav { display: flex !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          header { backdrop-filter: none !important; }
        }
      `}</style>
    </header>
  );
}
