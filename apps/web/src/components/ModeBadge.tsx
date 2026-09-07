export function ModeBadge({ mode }: { mode: "preview" | "testnet" | "mainnet" }) {
  const label =
    mode === "preview"
      ? "Preview — not live finance"
      : mode === "testnet"
        ? "Testnet"
        : "Mainnet";

  return (
    <span
      role="status"
      data-mode={mode}
      style={{
        display: "inline-block",
        width: "fit-content",
        padding: "0.35rem 0.65rem",
        border: "1px solid var(--border)",
        background: mode === "preview" ? "#fff7e8" : "var(--surface)",
        color: mode === "preview" ? "var(--warning)" : "var(--text)",
        fontSize: "0.8rem",
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </span>
  );
}
