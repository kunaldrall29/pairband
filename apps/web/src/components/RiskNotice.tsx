import { tokens } from "@pairband/ui";

export function RiskNotice() {
  return (
    <aside
      aria-label="Risk notice"
      style={{
        borderLeft: `4px solid ${tokens.warning}`,
        padding: "12px 16px",
        background: "#FFF8EE",
        borderRadius: 8,
        color: tokens.text,
        maxWidth: 640,
      }}
    >
      <strong>Manual exercise. No guaranteed liquidity.</strong>
      <p style={{ margin: "8px 0 0", color: tokens.muted }}>
        Pairband does not exercise for you. Writer outcomes can be worth less than USDC backing.
        Preview builds do not offer live markets or financial actions.
      </p>
    </aside>
  );
}
