"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { buildEducationalPayoffSeries, ILLUSTRATIVE_HERO } from "@pairband/domain";
import { tokens } from "@pairband/ui";

function parseWhole(s: string): bigint | null {
  if (!/^\d+$/.test(s.trim())) return null;
  try {
    return BigInt(s.trim());
  } catch {
    return null;
  }
}

export function PayoffExplorer() {
  const [exposure, setExposure] = useState(ILLUSTRATIVE_HERO.exposureEurc.toString());
  const [strike, setStrike] = useState(ILLUSTRATIVE_HERO.strikeUsdcPerEurc);
  const [premium, setPremium] = useState(ILLUSTRATIVE_HERO.premiumUsdc.toString());
  const [spot, setSpot] = useState("1.00");
  const [costs, setCosts] = useState("0");
  const [missed, setMissed] = useState(false);

  const series = useMemo(() => {
    const e = parseWhole(exposure);
    const p = parseWhole(premium);
    const c = parseWhole(costs);
    if (e === null || p === null || c === null) return null;
    try {
      return buildEducationalPayoffSeries({
        exposureEurc: e,
        strikeUsdcPerEurc: strike,
        premiumUsdc: p,
        additionalCostsUsdc: c,
        missedExercise: missed,
        spots: ["1.00", "1.10", "1.20", spot],
      });
    } catch {
      return null;
    }
  }, [exposure, strike, premium, costs, missed, spot]);

  const spotsForChart = series?.points.filter(
    (p, i, arr) => arr.findIndex((x) => x.spotUsdcPerEurc === p.spotUsdcPerEurc) === i,
  ) ?? [];

  const maxY = Math.max(
    1,
    ...spotsForChart.flatMap((p) => [
      Number(p.unprotectedUsdc),
      Number(p.protectedAfterPremiumUsdc),
    ]),
  );

  return (
    <section id="payoff" aria-labelledby="payoff-heading" style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <h2 id="payoff-heading" style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.75rem" }}>
          Payoff explainer
        </h2>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: tokens.radiusBadge,
            background: "#FFF6E8",
            color: tokens.warning,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Illustrative
        </span>
      </div>
      <p style={{ margin: 0, color: tokens.muted, maxWidth: 640 }}>
        Educational values only — not executable quotes. Hypothetical prices never enter the exercise
        contract.
      </p>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        }}
      >
        <label style={{ display: "grid", gap: 6, fontWeight: 600, fontSize: 14 }}>
          Exposure (EURC)
          <input
            value={exposure}
            onChange={(e) => setExposure(e.target.value)}
            inputMode="numeric"
            style={inputStyle}
          />
        </label>
        <label style={{ display: "grid", gap: 6, fontWeight: 600, fontSize: 14 }}>
          Strike (USDC/EURC)
          <input value={strike} onChange={(e) => setStrike(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 6, fontWeight: 600, fontSize: 14 }}>
          Premium (USDC)
          <input
            value={premium}
            onChange={(e) => setPremium(e.target.value)}
            inputMode="numeric"
            style={inputStyle}
          />
        </label>
        <label style={{ display: "grid", gap: 6, fontWeight: 600, fontSize: 14 }}>
          Extra costs (USDC)
          <input
            value={costs}
            onChange={(e) => setCosts(e.target.value)}
            inputMode="numeric"
            style={inputStyle}
          />
        </label>
      </div>

      <label style={{ display: "grid", gap: 8, fontWeight: 600, maxWidth: 420 }}>
        Hypothetical EURC price at decision: {spot} USDC/EURC
        <input
          type="range"
          min={90}
          max={130}
          value={Math.round(Number(spot) * 100) || 100}
          onChange={(e) => setSpot((Number(e.target.value) / 100).toFixed(2))}
          aria-valuetext={`${spot} USDC per EURC`}
        />
      </label>

      <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
        <input type="checkbox" checked={missed} onChange={(e) => setMissed(e.target.checked)} />
        Missed exercise
      </label>

      {series ? (
        <>
          <p role="status" style={{ margin: 0, fontWeight: 600 }}>
            {series.summary}
          </p>
          <svg
            viewBox="0 0 360 160"
            role="img"
            aria-label="Illustrative payoff chart with unprotected and protected holding values"
            style={{ width: "100%", maxWidth: 560, height: "auto", background: tokens.surface, borderRadius: 12, border: `1px solid ${tokens.border}` }}
          >
            <title>Illustrative payoff chart</title>
            {spotsForChart.map((p, i) => {
              const x = 40 + (i * 280) / Math.max(spotsForChart.length - 1, 1);
              const yU = 140 - (Number(p.unprotectedUsdc) / maxY) * 110;
              const yP = 140 - (Number(p.protectedAfterPremiumUsdc) / maxY) * 110;
              return (
                <g key={`${p.spotUsdcPerEurc}-${i}`}>
                  <circle cx={x} cy={yU} r={4} fill={tokens.muted} />
                  <circle cx={x} cy={yP} r={4} fill={tokens.action} />
                  {i > 0 ? (
                    <>
                      <line
                        x1={40 + ((i - 1) * 280) / Math.max(spotsForChart.length - 1, 1)}
                        y1={140 - (Number(spotsForChart[i - 1]!.unprotectedUsdc) / maxY) * 110}
                        x2={x}
                        y2={yU}
                        stroke={tokens.muted}
                        strokeWidth={2}
                      />
                      <line
                        x1={40 + ((i - 1) * 280) / Math.max(spotsForChart.length - 1, 1)}
                        y1={140 - (Number(spotsForChart[i - 1]!.protectedAfterPremiumUsdc) / maxY) * 110}
                        x2={x}
                        y2={yP}
                        stroke={tokens.action}
                        strokeWidth={2}
                      />
                    </>
                  ) : null}
                  <text x={x} y={155} textAnchor="middle" fontSize={10} fill={tokens.muted}>
                    {p.spotUsdcPerEurc}
                  </text>
                </g>
              );
            })}
            <text x={8} y={24} fontSize={11} fill={tokens.muted}>
              USDC value
            </text>
            <text x={200} y={18} fontSize={11} fill={tokens.muted}>
              muted=unprotected · teal=protected
            </text>
          </svg>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
              <caption style={{ textAlign: "left", paddingBottom: 8, color: tokens.muted }}>
                Table equivalent to the chart (illustrative)
              </caption>
              <thead>
                <tr>
                  <th style={th}>Hypothetical price</th>
                  <th style={th}>Unprotected EURC value</th>
                  <th style={th}>Holding plus option</th>
                </tr>
              </thead>
              <tbody>
                {["1.00", "1.10", "1.20"].map((s) => {
                  const row = spotsForChart.find((p) => p.spotUsdcPerEurc === s);
                  return (
                    <tr key={s}>
                      <td style={td}>{s} USDC/EURC</td>
                      <td style={td}>{row?.unprotectedUsdc ?? "—"} USDC</td>
                      <td style={td}>{row?.protectedAfterPremiumUsdc ?? "—"} USDC</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ margin: 0, color: tokens.muted, fontSize: 14 }}>
            Assumes sufficient EURC, timely exercise when useful, and stablecoin values as shown.
            Excludes gas, slippage and additional fees unless entered above. Do not treat these USDC
            figures as a guaranteed dollar balance.
          </p>
        </>
      ) : (
        <p role="alert" style={{ color: tokens.critical }}>
          Enter whole-number exposure, premium, and costs to update the illustrative series.
        </p>
      )}
    </section>
  );
}

const inputStyle: CSSProperties = {
  borderRadius: tokens.radiusField,
  border: `1px solid ${tokens.border}`,
  padding: "10px 12px",
  fontVariantNumeric: "tabular-nums",
  fontSize: 16,
};

const th: CSSProperties = {
  textAlign: "left",
  borderBottom: `1px solid ${tokens.border}`,
  padding: "8px 10px",
  fontSize: 13,
};

const td: CSSProperties = {
  borderBottom: `1px solid ${tokens.border}`,
  padding: "8px 10px",
  fontSize: 14,
};
