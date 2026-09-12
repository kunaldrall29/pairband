import { EarlyAccessForm } from "@/components/landing/EarlyAccessForm";
import { HeroPayCard } from "@/components/landing/HeroPayCard";
import { OutcomePreview } from "@/components/landing/OutcomePreview";
import { PublicHeader } from "@/components/landing/PublicHeader";
import {
  BuiltOn,
  Faq,
  Limits,
  PairsTable,
  PublicFooter,
  ThreeWays,
  TwoJobs,
  WhatHappens,
} from "@/components/landing/Sections";

export default function LandingPage() {
  return (
    <>
      <div className="banner">
        <div className="container">
          <strong>Product preview</strong>
          {" · "}
          Figures on this page are illustrative. Nothing here is executable.
        </div>
      </div>
      <PublicHeader />
      <main>
        <section className="section" style={{ paddingTop: "3.25rem", paddingBottom: "3.5rem" }}>
          <div
            className="container"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
              gap: "2.5rem",
              alignItems: "center",
            }}
          >
            <div className="hero-copy-rise">
              <p
                className="muted"
                style={{
                  margin: 0,
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Stablecoin pay and convert on Arc
              </p>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 550,
                  fontSize: "clamp(2.4rem, 5vw, 3.6rem)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.08,
                  margin: "0.85rem 0 1rem",
                }}
              >
                Pay the amount they asked for. Stay inside your band.
              </h1>
              <p className="muted" style={{ fontSize: "1.08rem", lineHeight: 1.6, maxWidth: 540 }}>
                Send USDC or EURC like a wire. If they need a different stable, Pairband converts through Uniswap and
                delivers the exact amount — with an invoice memo finance can audit. Gas is USDC. Settlement is final in
                under a second.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1.5rem" }}>
                <a className="btn btn-primary" href="#early-access">
                  Join early access
                </a>
                <a className="btn btn-secondary" href="#how-it-works">
                  See how it works
                </a>
              </div>
              <p className="muted fade-in" style={{ marginTop: "1.35rem", fontSize: "0.92rem" }}>
                Designed for: Starts with USDC and EURC · Exact-out payouts · Teams settle on Arc · Liquidity through
                Uniswap
              </p>
            </div>
            <HeroPayCard />
          </div>
        </section>
        <ThreeWays />
        <WhatHappens />
        <OutcomePreview />
        <PairsTable />
        <TwoJobs />
        <BuiltOn />
        <Limits />
        <Faq />
        <EarlyAccessForm />
      </main>
      <PublicFooter />
      <style>{`
        @media (max-width: 900px) {
          main > section:first-of-type .container {
            grid-template-columns: 1fr !important;
          }
          header nav a:not(.btn) {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
