import Link from "next/link";

export function ThreeWays() {
  return (
    <section className="section" id="how-it-works">
      <div className="container">
        <h2>Three ways to use Pairband.</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1.25rem",
            marginTop: "1.75rem",
          }}
        >
          <Way
            title="Pay"
            body="Hold USDC anywhere Circle can pull from. Name a payee, an exact amount, a currency, and a reference. Pairband converts only if needed, then sends with an Arc memo."
            href="/app/pay"
            cta="See a payout →"
          />
          <Way
            title="Convert"
            body="Rebalance team cash between USDC and EURC inside the same price band. No recipient. Same engine as Pay."
            href="/app/convert"
            cta="See a convert →"
          />
          <Way
            title="Workspace"
            body="Roles, spend limits, saved payees, and a ledger that exports like a bank CSV. Idle yield is off until a lending market is actually live and withdrawable in-session."
            href="/app"
            cta="See the workspace →"
            note="No yield is offered at launch, and no APY is shown anywhere on this page."
          />
        </div>
      </div>
    </section>
  );
}

function Way({
  title,
  body,
  href,
  cta,
  note,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
  note?: string;
}) {
  return (
    <article className="card" style={{ padding: "1.4rem" }}>
      <h3 style={{ margin: "0 0 0.6rem", fontFamily: "var(--font-display)", fontSize: "1.35rem" }}>
        {title}
      </h3>
      <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>
        {body}
      </p>
      {note ? (
        <p className="muted" style={{ margin: "0.75rem 0 0", fontSize: "0.85rem", lineHeight: 1.45 }}>
          {note}
        </p>
      ) : null}
      <Link href={href} style={{ display: "inline-block", marginTop: "1rem", fontWeight: 600 }}>
        {cta}
      </Link>
    </article>
  );
}

export function WhatHappens() {
  const steps = [
    {
      n: "01",
      title: "Fund cash",
      body: "Bring USDC from Arc, or from another chain through Circle’s Unified Balance / CCTP. The homepage shows one spendable number.",
    },
    {
      n: "02",
      title: "Set the band",
      body: "Choose who gets paid, the exact amount they must receive, the currency, and the worst price you will accept.",
    },
    {
      n: "03",
      title: "Convert only if needed",
      body: "Same-asset pays skip the pool. Cross-asset pays route Uniswap. If depth or price breaks the band, Pairband refuses.",
    },
    {
      n: "04",
      title: "Close with a receipt",
      body: "The payee gets the funds. You get a memo ID, the filled price, and a row in Activity.",
    },
  ];
  return (
    <section className="section" style={{ background: "rgba(26,58,52,0.03)" }}>
      <div className="container">
        <h2>What actually happens.</h2>
        <p className="muted" style={{ maxWidth: 560, lineHeight: 1.55 }}>
          A payout is one job, not three DeFi steps. Each line below is something you or the contract does.
        </p>
        <ol style={{ listStyle: "none", padding: 0, margin: "2rem 0 0", display: "grid", gap: "1.1rem" }}>
          {steps.map((s) => (
            <li key={s.n} className="card" style={{ padding: "1.15rem 1.25rem", display: "grid", gridTemplateColumns: "3.2rem 1fr", gap: 12 }}>
              <span style={{ fontWeight: 700, color: "var(--chip)" }}>{s.n}</span>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{s.title}</h3>
                <p className="muted" style={{ margin: "0.35rem 0 0", lineHeight: 1.5 }}>
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <div style={{ marginTop: "1.75rem" }} className="card">
          <div style={{ padding: "1.15rem 1.25rem" }}>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Terms used here</h3>
            <dl style={{ margin: 0, display: "grid", gap: 10 }}>
              <Term k="Band" v="Maximum all-in difference from mid you will accept." />
              <Term k="Exact-out" v="They receive a fixed amount; you spend whatever the band allows." />
              <Term k="Memo" v="Invoice / reference written on Arc with the transfer." />
              <Term k="Cash" v="Spendable USDC (and listed stables), not a yield number." />
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

function Term({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "6.5rem 1fr", gap: 10 }}>
      <dt style={{ fontWeight: 700 }}>{k}</dt>
      <dd className="muted" style={{ margin: 0 }}>
        {v}
      </dd>
    </div>
  );
}

export function PairsTable() {
  return (
    <section className="section" id="pairs">
      <div className="container">
        <h2>Pairs</h2>
        <p className="muted" style={{ maxWidth: 640, lineHeight: 1.55 }}>
          No production pairs are guaranteed at launch. The rows below show the shape of a listing — they are not
          quotes and cannot be traded.
        </p>
        <div className="card" style={{ marginTop: "1.5rem", overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Pair</th>
                <th>Use</th>
                <th>Max example size</th>
                <th>Band</th>
                <th>Route</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>USDC / USDC</td>
                <td>Pay</td>
                <td>25,000 USDC</td>
                <td>n/a</td>
                <td>Direct transfer + memo</td>
                <td>Example</td>
              </tr>
              <tr>
                <td>USDC → EURC</td>
                <td>Pay or convert</td>
                <td>10,000 EURC</td>
                <td>15 bps</td>
                <td>Uniswap</td>
                <td>Example</td>
              </tr>
              <tr>
                <td>EURC → USDC</td>
                <td>Pay or convert</td>
                <td>10,000 USDC</td>
                <td>15 bps</td>
                <td>Uniswap</td>
                <td>Example</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: "1rem", fontSize: "0.9rem", maxWidth: 720, lineHeight: 1.5 }}>
          A band is not a quote. Where a pool cannot fill the size we show <strong>No executable route</strong>. Where
          a data provider fails we show <strong>Quotes unavailable</strong>. Neither is displayed as 0.
        </p>
      </div>
    </section>
  );
}

export function TwoJobs() {
  return (
    <section className="section">
      <div className="container">
        <h2>Two different jobs inside the same account.</h2>
        <p className="muted">Paying contractors and parking idle cash are separate. They are not one deposit.</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem",
            marginTop: "1.5rem",
          }}
        >
          <article className="card" style={{ padding: "1.4rem" }}>
            <div className="muted" style={{ fontSize: 0.75, letterSpacing: "0.08em", fontWeight: 700 }}>
              PAY AND CONVERT
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", margin: "0.5rem 0" }}>Move money.</h3>
            <p className="muted" style={{ lineHeight: 1.55 }}>
              Exact-out to a payee, or convert in place. Capital stays in the team’s wallets. Pairband does not take
              custody.
            </p>
          </article>
          <article className="card" style={{ padding: "1.4rem" }}>
            <div className="muted" style={{ fontSize: 0.75, letterSpacing: "0.08em", fontWeight: 700 }}>
              HOLD CASH
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", margin: "0.5rem 0" }}>Leave what you did not send.</h3>
            <p className="muted" style={{ lineHeight: 1.55 }}>
              USDC that is not in flight stays spendable. Lending markets are wired only after they are live. No APY on
              this page.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

export function BuiltOn() {
  return (
    <section className="section" style={{ background: "rgba(26,58,52,0.03)" }}>
      <div className="container">
        <h2>What Pairband is built on.</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1.25rem",
            marginTop: "1.5rem",
          }}
        >
          <Tech
            title="Arc"
            body="USDC-denominated fees, native EURC, deterministic finality, and transaction memos. That is why a payout can look like a wire."
            note="Circle naming Pairband is not a grant, partnership, or endorsement."
          />
          <Tech
            title="Uniswap"
            body="v3 first for listed stable pairs. A v4 hook later, only if swap + pay + memo must be one transaction."
            note="The hook does not price the pair, guarantee depth, or put Pairband in the official Uniswap app."
          />
          <Tech
            title="Circle App Kit"
            body="Optional path to pull USDC from other chains into one spendable balance."
            note="App Kit does not replace the band check."
          />
        </div>
      </div>
    </section>
  );
}

function Tech({ title, body, note }: { title: string; body: string; note: string }) {
  return (
    <article className="card" style={{ padding: "1.35rem" }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p className="muted" style={{ lineHeight: 1.55 }}>
        {body}
      </p>
      <p className="muted" style={{ fontSize: "0.85rem", lineHeight: 1.45 }}>
        {note}
      </p>
    </article>
  );
}

export function Limits() {
  const items = [
    {
      t: "Band miss and no send",
      b: "If Uniswap cannot fill the exact-out inside your band, nothing leaves the wallet. A preview is not a fill.",
    },
    {
      t: "Thin or missing pairs",
      b: "USDC/EURC may not support larger sizes at launch. Other local stables are listed only after mainnet mint and two-sided liquidity.",
    },
    {
      t: "Two-step payout before the hook",
      b: "Until the hook is live, convert and send may be separate transactions. A price can move between them; the UI should still refuse a broken band.",
    },
    {
      t: "Smart-contract and network availability",
      b: "Contracts can have defects. Arc or an RPC can be down when you need to pay. Availability is not guaranteed.",
    },
    {
      t: "Stablecoin issuer, freeze and depeg",
      b: "USDC and EURC are issuer-controlled. Balances can be restricted. Either can trade away from the reference currency.",
    },
    {
      t: "Not a bank, not StableFX",
      b: "Pairband does not hold funds and does not use Circle’s institution-only FX API. Off-ramps to INR or bank EUR are out of scope for v1.",
    },
  ];
  return (
    <section className="section" id="limits">
      <div className="container">
        <h2>What can go wrong.</h2>
        <p className="muted" style={{ maxWidth: 640, lineHeight: 1.55 }}>
          A preview is not a fill. Everything below is a way a payment can fail to leave, or a way money can be lost
          after it does.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1rem",
            marginTop: "1.5rem",
          }}
        >
          {items.map((i) => (
            <article key={i.t} className="card" style={{ padding: "1.2rem" }}>
              <h3 style={{ margin: "0 0 0.45rem", fontSize: "1.05rem" }}>{i.t}</h3>
              <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>
                {i.b}
              </p>
            </article>
          ))}
        </div>
        <p className="muted" style={{ marginTop: "1.25rem", fontSize: "0.9rem" }}>
          No audit report exists. A badge appears only with a real report, its scope, and the commit it covers. Cash,
          pool TVL and lending deposits are never summed into one figure.
        </p>
      </div>
    </section>
  );
}

export function Faq() {
  const qs = [
    ["Is this a swap?", "Pay is a payout. Convert is a swap. If the payee needs another listed stable, a swap happens first. You should see one receipt either way."],
    ["Do I need EURC in the wallet to pay EURC?", "No. You need enough USDC (or Unified Balance) to stay inside the band. Pairband delivers EURC to them."],
    ["What if the EURC pool is empty?", "EURC payouts are disabled. USDC payouts with memos still work."],
    ["Can I pay rupees?", "Not in v1. There is no honest on-chain INR rail on Pairband. USDC and EURC only until a licensed off-ramp exists."],
    ["Do you hold my funds?", "No. Funds stay in the connected wallet or the team’s existing custody."],
    ["Is yield guaranteed?", "No yield is offered at launch. Any later cash market will show realized numbers, not a headline APY."],
    ["Is this Circle StableFX?", "No. StableFX is permissioned. Pairband is the open long-tail: invoices and team cash that institutions will not RFQ."],
    ["Is Pairband live on mainnet?", "In development. Arc public mainnet is scheduled for 16 September 2026. Access depends on that network, pool depth, and our own readiness."],
  ] as const;
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <h2>Questions</h2>
        <div style={{ display: "grid", gap: "0.85rem", marginTop: "1.25rem" }}>
          {qs.map(([q, a]) => (
            <details key={q} className="card" style={{ padding: "1rem 1.15rem" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>{q}</summary>
              <p className="muted" style={{ margin: "0.65rem 0 0", lineHeight: 1.55 }}>
                {a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PublicFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", padding: "2rem 0 3rem" }}>
      <div className="container" style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.1rem" }}>Pairband</div>
          <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.9rem" }}>
            Pay and convert stables on Arc.
          </p>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: "0.85rem", maxWidth: 420, lineHeight: 1.45 }}>
          Not a bank. Not StableFX. Not custody. Figures on the marketing site are illustrative.
        </p>
      </div>
    </footer>
  );
}
