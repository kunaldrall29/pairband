import {
  emptyStateCopy,
  formatAmount,
  tokens,
} from "@pairband/ui";

export function RoutePlaceholder({
  title,
  purpose,
}: {
  title: string;
  purpose: string;
}) {
  const empty = emptyStateCopy("markets");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <p
        style={{
          margin: 0,
          color: tokens.action,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        Preview scaffold
      </p>
      <h1
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.8rem, 4vw, 2.4rem)",
          lineHeight: 1.1,
        }}
      >
        {title}
      </h1>
      <p style={{ margin: 0, color: tokens.muted, maxWidth: 42 * 16 }}>{purpose}</p>
      <div
        style={{
          borderTop: `1px solid ${tokens.border}`,
          paddingTop: 16,
          display: "grid",
          gap: 8,
        }}
      >
        <strong>{empty.title}</strong>
        <span style={{ color: tokens.muted }}>{empty.body}</span>
        <span style={{ fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)" }}>
          Example unit labels only: {formatAmount(11_000_000_000n, "USDC")} backing ·{" "}
          {formatAmount(1_100_000n, "USDC_per_EURC")} strike — not a live quote.
        </span>
      </div>
    </div>
  );
}
