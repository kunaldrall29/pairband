import Link from "next/link";

export function PublicHeader() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        backdropFilter: "blur(10px)",
        background: "rgba(246, 241, 232, 0.86)",
        borderBottom: "1px solid rgba(26,58,52,0.08)",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 0",
          gap: "1rem",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <span
            aria-hidden
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "linear-gradient(145deg, #1a3a34, #2f6b5e)",
              display: "grid",
              placeItems: "center",
              color: "#F6F1E8",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            P
          </span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 600 }}>
            Pairband
          </span>
        </Link>
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.25rem",
            fontSize: "0.95rem",
            color: "var(--muted)",
          }}
        >
          <a href="#how-it-works">How it works</a>
          <a href="#pairs">Pairs</a>
          <a href="#limits">Limits</a>
          <a href="#early-access" className="btn btn-primary" style={{ padding: "0.55rem 1rem" }}>
            Join early access
          </a>
          <Link href="/app" className="btn btn-secondary" style={{ padding: "0.55rem 1rem" }}>
            Open app
          </Link>
        </nav>
      </div>
    </header>
  );
}
