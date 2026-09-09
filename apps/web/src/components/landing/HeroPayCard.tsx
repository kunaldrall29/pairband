export function HeroPayCard() {
  return (
    <aside className="card hero-card-rise" style={{ padding: "1.35rem 1.4rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "1.35rem",
            fontWeight: 550,
          }}
        >
          Pay 10,000.00 EURC
        </h2>
        <span className="chip">Illustrative example</span>
      </div>
      <dl style={{ margin: "1.1rem 0 0", display: "grid", gap: "0.85rem" }}>
        <Row label="Recipient" value="Contractor · saved payee" />
        <Row label="They receive" value="10,000.00 EURC" />
        <Row
          label="You spend"
          value="up to 10,820.00 USDC"
          hint="Mid 10,800.00 + band 16.20 + fees 3.80"
        />
        <Row label="Price band" value="15 bps vs mid" />
        <Row label="Reference" value="INV-1042 · written onchain" />
      </dl>
      <div
        style={{
          marginTop: "1.25rem",
          padding: "0.95rem 1rem",
          borderRadius: 14,
          background: "rgba(26,58,52,0.04)",
          border: "1px solid rgba(26,58,52,0.08)",
        }}
      >
        <div style={{ fontSize: 0.72, letterSpacing: "0.08em", fontWeight: 700, color: "var(--muted)" }}>
          CONDITIONAL PAY
        </div>
        <div style={{ marginTop: 6, fontWeight: 600 }}>Convert USDC → deliver 10,000.00 EURC + memo</div>
        <p className="muted" style={{ margin: "0.45rem 0 0", fontSize: "0.85rem", lineHeight: 1.45 }}>
          If the band cannot be filled, the payment does not send. Preview only — not a quote.
        </p>
      </div>
      </aside>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "7.5rem 1fr", gap: 12 }}>
      <dt className="muted" style={{ fontSize: "0.9rem" }}>
        {label}
      </dt>
      <dd style={{ margin: 0 }}>
        <div style={{ fontWeight: 600 }}>{value}</div>
        {hint ? (
          <div className="muted" style={{ fontSize: "0.8rem", marginTop: 2 }}>
            {hint}
          </div>
        ) : null}
      </dd>
    </div>
  );
}
