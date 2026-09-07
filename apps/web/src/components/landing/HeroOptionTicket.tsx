import { ILLUSTRATIVE_HERO } from "@pairband/domain";
import { tokens } from "@pairband/ui";

export function HeroOptionTicket() {
  return (
    <aside
      aria-label="Illustrative option ticket"
      style={{
        background: tokens.surface,
        border: `1px solid ${tokens.border}`,
        borderRadius: tokens.radiusCard,
        padding: 24,
        boxShadow: "0 12px 40px rgba(16,46,51,0.06)",
      }}
    >
      <p
        style={{
          margin: 0,
          display: "inline-flex",
          padding: "4px 10px",
          borderRadius: tokens.radiusBadge,
          background: "#FFF6E8",
          color: tokens.warning,
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        Illustrative example
      </p>
      <dl
        style={{
          margin: "16px 0 0",
          display: "grid",
          gap: 12,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <dt style={{ color: tokens.muted }}>Exposure</dt>
          <dd style={{ margin: 0, fontWeight: 700 }}>{ILLUSTRATIVE_HERO.eurcCoverage} EURC</dd>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <dt style={{ color: tokens.muted }}>Strike</dt>
          <dd style={{ margin: 0, fontWeight: 700 }}>
            {ILLUSTRATIVE_HERO.strikeUsdcPerEurc} USDC/EURC
          </dd>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <dt style={{ color: tokens.muted }}>Option quantity</dt>
          <dd style={{ margin: 0, fontWeight: 700 }}>
            {ILLUSTRATIVE_HERO.optionQuantityWhole} options
          </dd>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <dt style={{ color: tokens.muted }}>Premium</dt>
          <dd style={{ margin: 0, fontWeight: 700 }}>
            {ILLUSTRATIVE_HERO.premiumUsdc.toString()} USDC (illustrative)
          </dd>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <dt style={{ color: tokens.muted }}>Exercise</dt>
          <dd style={{ margin: 0, fontWeight: 600, textAlign: "right", maxWidth: "14rem" }}>
            {ILLUSTRATIVE_HERO.exerciseWindowLabel}
          </dd>
        </div>
        <div
          style={{
            borderTop: `1px solid ${tokens.border}`,
            paddingTop: 12,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <dt style={{ color: tokens.muted }}>If exercised</dt>
          <dd style={{ margin: 0, fontWeight: 700, textAlign: "right" }}>
            Deliver {ILLUSTRATIVE_HERO.eurcCoverage} EURC → receive{" "}
            {ILLUSTRATIVE_HERO.usdcOnExercise} USDC
          </dd>
        </div>
      </dl>
      <p style={{ margin: "16px 0 0", color: tokens.muted, fontSize: 14 }}>
        Exercise requires EURC delivery before the window closes. Premium is paid upfront and can be
        lost.
      </p>
    </aside>
  );
}
