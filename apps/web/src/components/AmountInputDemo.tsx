"use client";

import { useState } from "react";
import { formatAmount, tokens } from "@pairband/ui";
import { optionUnitsFromEurcExposure, formatRaw6 } from "@pairband/domain";

export function AmountInputDemo() {
  const [exposure, setExposure] = useState("10000");
  let parsed: ReturnType<typeof optionUnitsFromEurcExposure> | null = null;
  let error: string | null = null;
  try {
    parsed = optionUnitsFromEurcExposure(exposure);
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <section style={{ display: "grid", gap: 12, maxWidth: 420 }}>
      <label htmlFor="eurc-exposure" style={{ fontWeight: 600 }}>
        EURC exposure
      </label>
      <input
        id="eurc-exposure"
        inputMode="decimal"
        value={exposure}
        onChange={(e) => setExposure(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby="eurc-exposure-help"
        style={{
          borderRadius: tokens.radiusField,
          border: `1px solid ${error ? tokens.critical : tokens.border}`,
          padding: "12px 14px",
          fontVariantNumeric: "tabular-nums",
          fontSize: 16,
        }}
      />
      <p id="eurc-exposure-help" style={{ margin: 0, color: tokens.muted, fontSize: 14 }}>
        Up to four decimal places (0.0001 EURC). Units: EURC exposure → option quantity; strike uses
        USDC/EURC; premiums use USDC/option.
      </p>
      {error ? (
        <p role="alert" style={{ margin: 0, color: tokens.critical }}>
          {error}
        </p>
      ) : parsed ? (
        <ul style={{ margin: 0, paddingLeft: 18, fontVariantNumeric: "tabular-nums" }}>
          <li>Option quantity: {formatRaw6(parsed.optionUnits)} options</li>
          <li>Covered: {formatAmount(parsed.coveredEurc6, "EURC")}</li>
          <li>
            Unprotected remainder:{" "}
            {parsed.unprotectedRemainder6 === 0n
              ? "none"
              : formatAmount(parsed.unprotectedRemainder6, "EURC")}
          </li>
        </ul>
      ) : null}
    </section>
  );
}
