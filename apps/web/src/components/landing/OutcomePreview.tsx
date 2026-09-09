"use client";

import { useMemo, useState } from "react";

/** Educational outcome preview — not executable quotes. */
export function OutcomePreview() {
  const [receive, setReceive] = useState(10_000);
  const [mid, setMid] = useState(1.08);
  const [bandBps, setBandBps] = useState(15);
  const [fees, setFees] = useState(3.8);

  const maxSpend = useMemo(() => {
    const midSpend = receive * mid;
    return midSpend * (1 + bandBps / 10_000) + fees;
  }, [receive, mid, bandBps, fees]);

  const mids = [1.0719, 1.076, 1.08, 1.084, 1.0881];
  const rows = mids.map((m) => {
    const spend = receive * m + fees;
    return { mid: m, spend, sends: spend <= maxSpend };
  });

  return (
    <section className="section" id="outcome">
      <div className="container">
        <h2>See the outcome before you pay for it.</h2>
        <p className="muted" style={{ maxWidth: 640, lineHeight: 1.55 }}>
          <span className="chip" style={{ marginRight: 8 }}>
            Illustrative
          </span>
          Move the example size to see spend vs receive. These are educational values, not executable quotes.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)",
            gap: "1.25rem",
            marginTop: "1.5rem",
          }}
          className="outcome-grid"
        >
          <div className="card" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>Your example</h3>
            <label style={labelStyle}>
              They receive EURC, exact out
              <input
                type="range"
                min={1000}
                max={25000}
                step={100}
                value={receive}
                onChange={(e) => setReceive(Number(e.target.value))}
              />
              <strong>{receive.toLocaleString(undefined, { minimumFractionDigits: 2 })} EURC</strong>
            </label>
            <label style={labelStyle}>
              Reference mid USDC per EURC
              <input
                type="range"
                min={1.05}
                max={1.12}
                step={0.0001}
                value={mid}
                onChange={(e) => setMid(Number(e.target.value))}
              />
              <strong>{mid.toFixed(4)}</strong>
            </label>
            <label style={labelStyle}>
              Price band basis points vs mid
              <input
                type="range"
                min={5}
                max={50}
                step={1}
                value={bandBps}
                onChange={(e) => setBandBps(Number(e.target.value))}
              />
              <strong>{bandBps} bps</strong>
            </label>
            <label style={labelStyle}>
              Disclosed fees USDC
              <input
                type="range"
                min={0}
                max={20}
                step={0.1}
                value={fees}
                onChange={(e) => setFees(Number(e.target.value))}
              />
              <strong>{fees.toFixed(2)}</strong>
            </label>
            <p className="muted" style={{ fontSize: "0.85rem", lineHeight: 1.45 }}>
              Same-asset pay USDC to USDC needs no route and no band: a direct transfer plus a memo.
            </p>
          </div>
          <div className="card" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>Spend required as the mid moves</h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160, margin: "1rem 0" }}>
              {rows.map((r) => (
                <div key={r.mid} style={{ flex: 1, textAlign: "center" }}>
                  <div
                    style={{
                      height: `${Math.min(140, (r.spend / (maxSpend * 1.05)) * 140)}px`,
                      background: r.sends ? "var(--ink)" : "var(--danger)",
                      borderRadius: 8,
                      opacity: r.sends ? 0.85 : 0.55,
                      transition: "height 200ms ease",
                    }}
                    title={r.sends ? "Sends" : "Does not send"}
                  />
                  <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                    {r.mid.toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
            <p style={{ lineHeight: 1.5 }}>
              To deliver <strong>{receive.toLocaleString(undefined, { minimumFractionDigits: 2 })} EURC</strong> at{" "}
              <strong>{mid.toFixed(4)}</strong> USDC per EURC, Pairband would spend{" "}
              <strong>{(receive * mid).toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC</strong> plus
              disclosed fees. If mid moves so spend would exceed{" "}
              <strong>{maxSpend.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</strong>, the payment does
              not send.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Reference mid</th>
                  <th>You spend (USDC)</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.mid}>
                    <td>{r.mid.toFixed(4)}</td>
                    <td>{r.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{r.sends ? "Sends" : "Does not send"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted" style={{ fontSize: "0.8rem" }}>
              Assumes a listed USDC/EURC pool. These are not guaranteed balances.
            </p>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .outcome-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  marginBottom: 14,
  fontSize: "0.9rem",
};
