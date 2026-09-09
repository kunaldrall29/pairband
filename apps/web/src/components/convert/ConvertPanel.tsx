"use client";

import { ACTIVE_CHAIN } from "@pairband/config";

export function ConvertPanel() {
  if (!ACTIVE_CHAIN.eurcRoutesEnabled || !ACTIVE_CHAIN.uniswapV3.quoterV2) {
    return (
      <div className="card" style={{ padding: "1.5rem" }}>
        <h1 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>Convert</h1>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>This pair is not listed</p>
        <p className="muted" style={{ lineHeight: 1.55 }}>
          USDC↔EURC convert stays off until a Uniswap pool can fill measured size inside the band. Same-asset Pay still
          works. We will not show a fake 0 quote.
        </p>
        <a className="btn btn-primary" href="/app/pay" style={{ marginTop: 8 }}>
          Pay USDC
        </a>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <h1 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>Convert</h1>
      <p className="muted">Quoter bound — convert UI ships when live depth is verified.</p>
    </div>
  );
}
