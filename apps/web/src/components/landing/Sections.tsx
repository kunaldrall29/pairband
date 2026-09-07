import type { CSSProperties } from "react";
import Link from "next/link";
import { ILLUSTRATIVE_WRITER_LOSS } from "@pairband/domain";
import { tokens } from "@pairband/ui";

export function UseCaseCards() {
  const cards = [
    {
      title: "Protect",
      body: "Hold EURC and buy an option that gives you a fixed USDC exchange rate during its exercise window.",
      href: "/protect",
      cta: "Explore protection",
    },
    {
      title: "Earn",
      body: "Lock USDC to write options. Receive premium when they sell, and accept EURC if holders exercise.",
      href: "/earn",
      cta: "Understand writing",
      warn: "Your returned assets can be worth less than your original deposit.",
    },
    {
      title: "Trade",
      body: "Buy or sell listed option tokens through Uniswap v4 before trading closes.",
      href: "/markets",
      cta: "Explore markets",
    },
  ] as const;

  return (
    <section aria-labelledby="usecases-heading" style={{ display: "grid", gap: 20 }}>
      <h2 id="usecases-heading" style={h2}>
        Three ways to use Pairband
      </h2>
      <div
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        {cards.map((c) => (
          <article
            key={c.title}
            style={{
              padding: 20,
              borderTop: `3px solid ${tokens.action}`,
              background: tokens.surface,
            }}
          >
            <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.35rem" }}>
              {c.title}
            </h3>
            <p style={{ color: tokens.muted, margin: "12px 0" }}>{c.body}</p>
            {"warn" in c && c.warn ? (
              <p style={{ color: tokens.warning, fontSize: 14, fontWeight: 600 }}>{c.warn}</p>
            ) : null}
            <Link href={c.href} style={{ fontWeight: 700, color: tokens.action }}>
              {c.cta}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function LifecycleSteps() {
  const steps = [
    {
      t: "Choose a series",
      d: "Select an available strike and exercise window for EURC/USDC.",
    },
    {
      t: "Pay the premium",
      d: "Buy option tokens with USDC. Your EURC remains in your wallet until you choose to exercise.",
    },
    {
      t: "Decide during the window",
      d: "Deliver the required EURC to receive the fixed USDC amount, or let the option expire. Secondary trading on the registered Pairband pool closes when exercise begins.",
    },
    {
      t: "Close the position",
      d: "Used options are burned. Unused options expire. Writers claim their share of the remaining USDC and any EURC delivered after the window ends.",
    },
  ];
  return (
    <section id="how-it-works" aria-labelledby="lifecycle-heading" style={{ display: "grid", gap: 20 }}>
      <h2 id="lifecycle-heading" style={h2}>
        How it works
      </h2>
      <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 16, maxWidth: 720 }}>
        {steps.map((s) => (
          <li key={s.t}>
            <strong>{s.t}.</strong> <span style={{ color: tokens.muted }}>{s.d}</span>
          </li>
        ))}
      </ol>
      <aside
        aria-label="Glossary"
        style={{
          borderLeft: `4px solid ${tokens.softHighlight}`,
          padding: "8px 16px",
          color: tokens.muted,
          fontSize: 14,
          maxWidth: 640,
        }}
      >
        <strong style={{ color: tokens.text }}>Glossary:</strong> strike = USDC received per EURC on
        exercise; premium = option purchase price; exercise = using the exchange right; expiry = final
        exercise deadline. There is no automatic settlement.
      </aside>
    </section>
  );
}

export function MarketPreview({ mode }: { mode: "preview" | "testnet" | "mainnet" }) {
  return (
    <section id="markets" aria-labelledby="markets-heading" style={{ display: "grid", gap: 16 }}>
      <h2 id="markets-heading" style={h2}>
        Markets preview
      </h2>
      <p style={{ margin: 0, color: tokens.muted }}>
        {mode === "preview"
          ? "Preview shows fixture cards only. No trade button. Live series appear after the indexer."
          : "Testnet/mainnet market rows require verified indexed data."}
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
          <thead>
            <tr>
              {["Pair", "Strike", "Trading closes", "Exercise window", "Buy premium", "Status"].map(
                (h) => (
                  <th key={h} style={th}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={td}>
                EURC put / USDC <span style={example}>Example</span>
              </td>
              <td style={td}>1.10 USDC/EURC</td>
              <td style={td}>Example cutoff</td>
              <td style={td}>Example window</td>
              <td style={td}>200 USDC / 100 options (illustrative)</td>
              <td style={td}>Example — not listed</td>
            </tr>
            <tr>
              <td style={td} colSpan={6}>
                <span style={{ color: tokens.muted }}>
                  Additional series: Quotes unavailable until indexed. Missing liquidity is never shown
                  as 0 USDC.
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function CapitalRoles() {
  return (
    <section aria-labelledby="capital-heading" style={{ display: "grid", gap: 16 }}>
      <h2 id="capital-heading" style={h2}>
        Two different ways to supply capital
      </h2>
      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <article style={{ background: tokens.surface, padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>Writer</h3>
          <p style={{ color: tokens.muted }}>
            Back EURC puts with USDC. Minting locks the full exercise amount and creates an option token
            plus a writer receipt. Selling the option earns premium. After expiry, the receipt claims your
            share of USDC and any EURC received from exercises.
          </p>
          <p style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
            Example: {ILLUSTRATIVE_WRITER_LOSS.backingUsdc.toString()} USDC backing → possible{" "}
            {ILLUSTRATIVE_WRITER_LOSS.eurcReturned.toString()} EURC return. Illustrative loss{" "}
            {ILLUSTRATIVE_WRITER_LOSS.illustrativeLossUsdc.toString()} USDC at spot 1.00 after{" "}
            {ILLUSTRATIVE_WRITER_LOSS.premiumReceivedUsdc.toString()} USDC premium.
          </p>
          <p style={{ color: tokens.warning, fontSize: 14, fontWeight: 600 }}>
            Premium stays with whoever sold the option; transferring a receipt does not transfer historical
            premium.
          </p>
        </article>
        <article style={{ background: tokens.surface, padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>Liquidity provider</h3>
          <p style={{ color: tokens.muted }}>
            Supply option tokens and USDC to a Uniswap v4 pool. Earn trading fees while accepting changes
            in the value and composition of your position. LP capital is separate from writer collateral.
            Option tokens inside an LP position must be withdrawn before they can be exercised, and expire
            if unused. Fee collection alone is not exercising.
          </p>
          <p style={{ color: tokens.muted, fontSize: 14 }}>No projected APY in v1.</p>
        </article>
      </div>
    </section>
  );
}

export function RiskSummary() {
  const items = [
    "Option expiry and manual exercise — reminders are best-effort and do not exercise for you.",
    "Writer loss and EURC exposure when holders exercise.",
    "Liquidity and quote risk — sales are not guaranteed.",
    "Smart-contract and network availability risk; this build is unaudited.",
    "Stablecoin issuer, transfer restriction, and depeg risk.",
  ];
  return (
    <section id="risks" aria-labelledby="risks-heading" style={{ display: "grid", gap: 12 }}>
      <h2 id="risks-heading" style={h2}>
        Risks
      </h2>
      <ul style={{ margin: 0, paddingLeft: 20, color: tokens.muted, maxWidth: 720 }}>
        {items.map((i) => (
          <li key={i} style={{ marginBottom: 8 }}>
            {i}
          </li>
        ))}
      </ul>
      <Link href="/risk" style={{ fontWeight: 700, color: tokens.action }}>
        Read the risk page
      </Link>
    </section>
  );
}

export function Faq() {
  const faqs = [
    {
      q: "Is this a swap?",
      a: "Buying an option buys a future exchange right. Exercising uses it. Trading the option on Uniswap is a separate transaction.",
    },
    {
      q: "Do I deposit EURC when buying?",
      a: "No. You need USDC for premium and gas. You must deliver the required EURC if you exercise later.",
    },
    {
      q: "What happens if EURC rises?",
      a: "You can keep the EURC and leave the option unused. The premium remains a cost.",
    },
    {
      q: "What if I miss the exercise window?",
      a: "The option expires and cannot be used. Reminders are best-effort and do not exercise for you.",
    },
    {
      q: "Is writer yield guaranteed?",
      a: "No. Options may not sell. Exercised options exchange your USDC backing for EURC that can be worth less. Writing and providing AMM liquidity are different activities.",
    },
    {
      q: "Can I sell early?",
      a: "You may sell before the Pairband market cutoff if there is sufficient liquidity. A sale is not guaranteed and may realize a loss.",
    },
    {
      q: "Does fully collateralized mean safe?",
      a: "It means the contract reserves the specified USDC exercise amount. It does not remove code, issuer, depeg, transfer, liquidity or expiry risks.",
    },
    {
      q: "Is Pairband live on mainnet?",
      a: "Pairband is in development/testnet. Mainnet access will depend on security, market and deployment readiness.",
    },
  ];
  return (
    <section aria-labelledby="faq-heading" style={{ display: "grid", gap: 12 }}>
      <h2 id="faq-heading" style={h2}>
        FAQ
      </h2>
      <div style={{ display: "grid", gap: 12, maxWidth: 720 }}>
        {faqs.map((f) => (
          <details key={f.q} style={{ background: tokens.surface, padding: "12px 16px" }}>
            <summary style={{ fontWeight: 700, cursor: "pointer" }}>{f.q}</summary>
            <p style={{ color: tokens.muted, margin: "8px 0 0" }}>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function PublicFooter() {
  return (
    <footer
      style={{
        borderTop: `1px solid ${tokens.border}`,
        padding: "32px 0",
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        color: tokens.muted,
        fontSize: 14,
      }}
    >
      <a href="https://github.com/kunaldrall29/pairband" style={{ color: tokens.muted }}>
        GitHub
      </a>
      <Link href="/risk" style={{ color: tokens.muted }}>
        Risks
      </Link>
      <Link href="/status" style={{ color: tokens.muted }}>
        Network status
      </Link>
      <span>Terms/privacy drafts are not published as legal approval.</span>
    </footer>
  );
}

export function TechnologySection() {
  return (
    <section aria-labelledby="tech-heading" style={{ display: "grid", gap: 12 }}>
      <h2 id="tech-heading" style={h2}>
        Why Arc and Uniswap
      </h2>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <p style={{ margin: 0, color: tokens.muted }}>
          Arc provides USDC-denominated transaction fees and stablecoin settlement. This is a product
          thesis, not a grant or endorsement.
        </p>
        <p style={{ margin: 0, color: tokens.muted }}>
          Uniswap v4 provides option-token markets, with a Pairband hook that enforces each market&apos;s
          trading lifecycle. The hook does not supply collateral, calculate fair value, or guarantee
          liquidity.
        </p>
      </div>
    </section>
  );
}

const h2: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: "1.75rem",
};

const th: CSSProperties = {
  textAlign: "left",
  borderBottom: `1px solid ${tokens.border}`,
  padding: "8px 10px",
  fontSize: 13,
};

const td: CSSProperties = {
  borderBottom: `1px solid ${tokens.border}`,
  padding: "10px",
  fontSize: 14,
  verticalAlign: "top",
};

const example: CSSProperties = {
  marginLeft: 8,
  fontSize: 11,
  fontWeight: 700,
  color: tokens.warning,
  background: "#FFF6E8",
  borderRadius: 999,
  padding: "2px 8px",
};
