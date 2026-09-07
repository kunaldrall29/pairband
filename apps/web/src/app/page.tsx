import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { PublicHeader } from "../components/landing/PublicHeader";
import { HeroOptionTicket } from "../components/landing/HeroOptionTicket";
import { PayoffExplorer } from "../components/landing/PayoffExplorer";
import { EarlyAccessForm } from "../components/landing/EarlyAccessForm";
import {
  CapitalRoles,
  Faq,
  LifecycleSteps,
  MarketPreview,
  PublicFooter,
  RiskSummary,
  TechnologySection,
  UseCaseCards,
} from "../components/landing/Sections";
import { tokens } from "@pairband/ui";

const mode = (process.env.NEXT_PUBLIC_PAIRBAND_MODE ?? "preview") as
  | "preview"
  | "testnet"
  | "mainnet";

export const metadata: Metadata = {
  title: "Pairband — stablecoin FX options on Arc (preview)",
  description:
    "Buy or write USDC-backed EURC put options. Preview build — illustrative examples only; not live finance.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Pairband — preview",
    description: "USDC-backed EURC options on Arc. Product preview; no live markets in this build.",
  },
};

export default function LandingPage() {
  const primaryCta =
    mode === "preview"
      ? { href: "#early-access", label: "Join early access" }
      : { href: "/protect", label: mode === "testnet" ? "Try the testnet app" : "Open app" };

  return (
    <>
      <PublicHeader mode={mode} />
      <main>
        <section
          aria-label="Hero"
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "48px 20px 64px",
            display: "grid",
            gap: 40,
            gridTemplateColumns: "minmax(0, 1fr)",
            alignItems: "start",
          }}
          className="pb-hero"
        >
          <div style={{ display: "grid", gap: 18, maxWidth: 520 }}>
            <p
              style={{
                margin: 0,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontSize: 12,
                fontWeight: 700,
                color: tokens.muted,
              }}
            >
              Stablecoin FX options on Arc
            </p>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.25rem, 5vw, 3.6rem)",
                lineHeight: 1.05,
                fontWeight: 700,
              }}
            >
              Pairband
            </h1>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                lineHeight: 1.2,
                fontWeight: 600,
              }}
            >
              Set your EURC exit rate. Keep your upside.
            </p>
            <p style={{ margin: 0, color: tokens.muted, fontSize: "1.125rem" }}>
              Buy the right to exchange EURC for USDC at a fixed rate during a chosen exercise window.
              Pay an upfront premium, or supply USDC backing and sell options to earn premium.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <a
                href={primaryCta.href}
                style={{
                  background: tokens.action,
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: 12,
                  padding: "14px 18px",
                  fontWeight: 700,
                }}
              >
                {primaryCta.label}
              </a>
              <a
                href="#how-it-works"
                style={{
                  border: `1px solid ${tokens.border}`,
                  background: tokens.surface,
                  color: tokens.text,
                  textDecoration: "none",
                  borderRadius: 12,
                  padding: "14px 18px",
                  fontWeight: 700,
                }}
              >
                See how it works
              </a>
            </div>
            <p style={{ margin: 0, color: tokens.muted, fontSize: 14 }}>
              {mode === "preview" ? "Designed for " : ""}
              EURC/USDC ·{" "}
              <a href="#collateral" style={{ color: tokens.action }}>
                Fully collateralized
              </a>{" "}
              contracts · Options traded through Uniswap v4
            </p>
          </div>
          <HeroOptionTicket />
        </section>

        <div style={band}>
          <UseCaseCards />
        </div>
        <div style={band}>
          <LifecycleSteps />
        </div>
        <div style={band}>
          <PayoffExplorer />
        </div>
        <div style={band}>
          <MarketPreview mode={mode} />
        </div>
        <div style={band}>
          <CapitalRoles />
        </div>
        <div style={band}>
          <TechnologySection />
        </div>
        <div style={band} id="collateral">
          <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>Fully collateralized</h2>
          <p style={{ color: tokens.muted, maxWidth: 720 }}>
            The series vault reserves the specified USDC exercise amount for outstanding options. That
            does not remove issuer, depeg, transfer, code, liquidity, or expiry risks.
          </p>
        </div>
        <div style={band}>
          <RiskSummary />
        </div>
        <div style={band}>
          <Faq />
        </div>
        <div style={band}>
          <EarlyAccessForm />
        </div>
        <div style={{ ...band, paddingBottom: 64 }}>
          <PublicFooter />
        </div>
      </main>
      <style>{`
        @media (min-width: 960px) {
          .pb-hero {
            grid-template-columns: 5fr 7fr !important;
          }
        }
      `}</style>
    </>
  );
}

const band: CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "40px 20px",
};
