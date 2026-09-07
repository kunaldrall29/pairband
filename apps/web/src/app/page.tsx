import { ModeBadge } from "../components/ModeBadge";

const mode = (process.env.NEXT_PUBLIC_PAIRBAND_MODE ?? "preview") as
  | "preview"
  | "testnet"
  | "mainnet";

export default function PreviewLandingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        alignContent: "center",
        padding: "clamp(1.5rem, 4vw, 4rem)",
        gap: "1.25rem",
        maxWidth: "42rem",
      }}
    >
      <ModeBadge mode={mode} />
      <p
        style={{
          margin: 0,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontSize: "0.75rem",
          color: "var(--muted)",
        }}
      >
        Pairband
      </p>
      <h1
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2.4rem, 6vw, 3.6rem)",
          lineHeight: 1.05,
          fontWeight: 600,
        }}
      >
        Pairband
      </h1>
      <p style={{ margin: 0, fontSize: "1.125rem", color: "var(--muted)", maxWidth: "36rem" }}>
        USDC-backed EURC options on Arc — preview scaffold only. No live markets, quotes, or
        financial actions in this build.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
        <a
          href="/app"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.1rem",
            background: "var(--action)",
            color: "#fff",
            textDecoration: "none",
            borderRadius: "4px",
          }}
        >
          Open app shell
        </a>
        <a
          href="https://github.com/kunaldrall29/pairband"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.1rem",
            border: "1px solid var(--border)",
            color: "var(--text)",
            textDecoration: "none",
            borderRadius: "4px",
            background: "var(--surface)",
          }}
        >
          Repository
        </a>
      </div>
    </main>
  );
}
