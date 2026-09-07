/**
 * Labeled fixture quote builder for preview/local demos.
 * Disclosed formula — not a live market premium. Never executable for wallet submit in preview.
 */
import type { QuoteRequest, QuoteResponse } from "./schemas.js";
import { maxUsdcWithSlippage } from "./semantics.js";

/** Fixture premium: 0.02 USDC per whole option (20_000 raw6 per 1e6 units). Labeled only. */
export const FIXTURE_PREMIUM_USDC6_PER_OPTION_UNIT = 20_000n;

function stableQuoteId(parts: string[]): string {
  // FNV-1a 32-bit — deterministic, no Node crypto (SDK may load in browser bundles).
  let h = 0x811c9dc5;
  const s = parts.join(":");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `fixture-${(h >>> 0).toString(16).padStart(8, "0")}`;
}

export function buildFixtureBuyQuote(req: QuoteRequest): QuoteResponse {
  const units = BigInt(req.optionUnits);
  const expected = (units * FIXTURE_PREMIUM_USDC6_PER_OPTION_UNIT) / 1_000_000n;
  const maxUSDC6 = maxUsdcWithSlippage(expected, req.slippageBps);
  const expiresAt = new Date(Date.now() + 30_000).toISOString();

  return {
    quoteId: stableQuoteId([
      req.seriesId,
      req.optionUnits,
      req.account,
      String(req.slippageBps),
    ]),
    seriesId: req.seriesId,
    side: "buy",
    optionUnits: req.optionUnits,
    expectedUSDC6: expected.toString(),
    maxUSDC6: maxUSDC6.toString(),
    poolId: (`0x${"88".repeat(32)}`) as `0x${string}`,
    poolFeeIncluded: true,
    protocolIssuanceFee6: "0",
    expiresAt,
    tradingCutoff: null,
    spender: null,
    allowanceNeeded: maxUSDC6.toString(),
    executable: false,
    provenance: {
      chainId: 31_337,
      blockNumber: "3",
      blockHash: (`0x${"cc".repeat(32)}`) as `0x${string}`,
      observedAt: new Date().toISOString(),
      source: "fixture",
      stale: false,
      indexedThroughBlock: "3",
      label: "fixture",
    },
    unsignedTransaction: null,
    simulation: "skipped",
    warningCodes: ["FIXTURE_NOT_EXECUTABLE", "PREVIEW_MODE"],
    note: "Labeled fixture exact-output economics (0.02 USDC/option disclosed). Not Arc live liquidity. Cannot prepare a real transaction in preview.",
  };
}
