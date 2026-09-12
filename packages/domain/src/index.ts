/**
 * Band math and quote helpers for exact-out Pay / Convert.
 * Integer / bigint preferred for amounts (token base units).
 */

export type BandCheckInput = {
  /** Exact amount the payee must receive (tokenOut base units). */
  amountOut: bigint;
  /** Simulated inclusive amountIn from Quoter (tokenIn base units). */
  amountInInclusiveFees: bigint;
  /** Mid: tokenIn per 1 tokenOut, in 1e18 fixed point (e.g. 1.08 USDC/EURC → 1.08e18). */
  midRay: bigint;
  /** Max all-in vs mid, in basis points. */
  bandBps: number;
  /** Pairband convert fee already included in amountInInclusiveFees, or added here. */
  pairbandFeeIn?: bigint;
};

export type BandCheckResult =
  | { ok: true; maxAmountIn: bigint; midAmountIn: bigint }
  | { ok: false; reason: "no_executable_route"; maxAmountIn: bigint; midAmountIn: bigint };

const RAY = 10n ** 18n;
const BPS_DENOM = 10_000n;

/** Mid spend for exact-out: amountOut * midRay / 1e18 (same decimals assumed for stables). */
export function midAmountIn(amountOut: bigint, midRay: bigint): bigint {
  return (amountOut * midRay) / RAY;
}

/** Max spend allowed by band: mid * (1 + bandBps/10000) + optional fee. */
export function maxAmountInFromBand(
  amountOut: bigint,
  midRay: bigint,
  bandBps: number,
  pairbandFeeIn: bigint = 0n,
): bigint {
  if (bandBps < 0 || bandBps > 10_000) {
    throw new Error("bandBps out of range");
  }
  const mid = midAmountIn(amountOut, midRay);
  const slack = (mid * BigInt(bandBps)) / BPS_DENOM;
  return mid + slack + pairbandFeeIn;
}

export function checkBand(input: BandCheckInput): BandCheckResult {
  const fee = input.pairbandFeeIn ?? 0n;
  const mid = midAmountIn(input.amountOut, input.midRay);
  const max = maxAmountInFromBand(
    input.amountOut,
    input.midRay,
    input.bandBps,
    fee,
  );
  if (input.amountInInclusiveFees > max) {
    return {
      ok: false,
      reason: "no_executable_route",
      maxAmountIn: max,
      midAmountIn: mid,
    };
  }
  return { ok: true, maxAmountIn: max, midAmountIn: mid };
}

export function isQuoteExpired(expiresAtMs: number, nowMs: number = Date.now()): boolean {
  return nowMs >= expiresAtMs;
}

/** Same-asset pay: no pool, band n/a, amountIn === amountOut. */
export function sameAssetPayPreview(amountOut: bigint): {
  amountIn: bigint;
  bandApplicable: false;
} {
  return { amountIn: amountOut, bandApplicable: false };
}

export type QuoteRefusal =
  | "no_executable_route"
  | "quotes_unavailable"
  | "pair_disabled"
  | "quote_expired"
  | "token_not_allowed";

export function refuseMessage(reason: QuoteRefusal): string {
  switch (reason) {
    case "no_executable_route":
      return "No executable route";
    case "quotes_unavailable":
      return "Quotes unavailable";
    case "pair_disabled":
      return "This pair is not listed";
    case "quote_expired":
      return "Refresh price";
    case "token_not_allowed":
      return "Token not allowed";
  }
}

/** Memo charset: printable ASCII, length capped for Arc Memo. */
export function validateMemo(reference: string, maxLen = 64): { ok: true } | { ok: false; error: string } {
  const trimmed = reference.trim();
  if (!trimmed) return { ok: false, error: "Reference is required" };
  if (trimmed.length > maxLen) return { ok: false, error: `Reference max ${maxLen} characters` };
  if (!/^[\x20-\x7E]+$/.test(trimmed)) {
    return { ok: false, error: "Reference must be printable ASCII" };
  }
  return { ok: true };
}

export function isAddressLike(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}
