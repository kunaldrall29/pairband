"use client";

import { formatAmount, nextTxPhase, type TxPhase } from "@pairband/ui";
import { useMemo, useState } from "react";

const labels: Record<TxPhase, string> = {
  editing: "Edit inputs",
  validating: "Validating",
  awaiting_approval_signature: "Approve in wallet",
  approval_submitted: "Approval submitted",
  approval_confirmed: "Approval confirmed",
  reviewing: "Review transaction",
  awaiting_action_signature: "Sign action",
  submitted: "Submitted — awaiting confirmation",
  confirmed: "Confirmed onchain",
  rejected: "Signature rejected",
  quote_expired: "Quote expired — refresh",
  reverted: "Transaction reverted",
  replaced: "Replaced transaction",
  cancelled: "Cancelled",
  unknown: "Outcome unknown — inspect hash; do not resubmit blindly",
  network_changed: "Network changed — review again",
};

/** Shared transaction progress for later Protect/Earn/Markets flows. */
export function TransactionProgress({
  initial = "editing",
}: {
  initial?: TxPhase;
}) {
  const [phase, setPhase] = useState<TxPhase>(initial);
  const gasHint = useMemo(() => formatAmount(0n, "USDC"), []);

  return (
    <section aria-live="polite" style={{ display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.25rem" }}>
        Transaction state
      </h2>
      <p style={{ margin: 0, color: "var(--pb-muted)" }}>{labels[phase]}</p>
      <p style={{ margin: 0, fontSize: 14, color: "var(--pb-muted)" }}>
        Gas shown in USDC units when estimates exist. Native18 and ERC-20 USDC are the same asset —
        never summed. Current placeholder: {gasHint} (no fabricated estimate).
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(
          [
            ["validate", "Validate"],
            ["need_approval", "Need approval"],
            ["sign_action", "Sign action"],
            ["submitted", "Submitted"],
            ["confirmed", "Confirmed"],
            ["reject", "Reject"],
            ["unknown", "Unknown"],
            ["reset", "Reset"],
          ] as const
        ).map(([event, label]) => (
          <button
            key={event}
            type="button"
            onClick={() => setPhase((p) => nextTxPhase(p, event))}
            style={{
              borderRadius: 12,
              border: "1px solid var(--pb-border)",
              background: "#fff",
              padding: "8px 12px",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
