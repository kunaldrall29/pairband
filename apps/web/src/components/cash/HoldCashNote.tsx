export default function HoldCashNote() {
  return (
    <div className="card" style={{ padding: "1.25rem", marginTop: "1.25rem" }}>
      <div className="muted" style={{ fontSize: 0.75, letterSpacing: "0.08em", fontWeight: 700 }}>
        HOLD CASH
      </div>
      <h2 style={{ margin: "0.4rem 0", fontFamily: "var(--font-display)", fontSize: "1.25rem" }}>
        Leave what you did not send.
      </h2>
      <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>
        Lending markets (Morpho / Aave) stay off until they are live on Arc and a withdraw fits the same session. No APY
        is shown. Cash is not LP.
      </p>
    </div>
  );
}
