/**
 * Pairband options-v2 integer domain model (O02).
 * Authoritative economics: docs/reference/protocol.md
 * Amounts use bigint; never pass through JavaScript Number for settlement math.
 */

export const OPTION_DECIMALS = 6;
export const RECEIPT_DECIMALS = 6;
export const UNDERLYING_DECIMALS = 6;
export const SETTLEMENT_DECIMALS = 6;
export const UNDERLYING_PER_UNIT_6 = 100n;
export const DEFAULT_STRIKE_PER_UNIT_6 = 110n;
export const WHOLE_OPTION_SCALE = 1_000_000n;
export const MAX_WRITER_UNITS_TECHNICAL = 10n ** 12n;
export const ISSUANCE_FEE_BPS_HARD_CAP = 50;
export const MAX_EURC_EXPOSURE_DECIMALS = 4; // 0.0001 EURC = smallest deliverable

export type Phase = 'scheduled' | 'trading' | 'exercise' | 'matured';

export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export function assertPositiveUnits(q: bigint, label = 'optionUnits'): void {
  if (q <= 0n) throw new DomainError('INVALID_AMOUNT', `${label} must be > 0`);
}

export function assertSafeCap(q: bigint, maxWriterUnits: bigint): void {
  if (q > maxWriterUnits) {
    throw new DomainError('CAPACITY_EXCEEDED', 'quantity exceeds series maxWriterUnits');
  }
  if (q > MAX_WRITER_UNITS_TECHNICAL) {
    throw new DomainError('TECHNICAL_CAP', 'quantity exceeds technical 1e12 raw unit bound');
  }
}

export function phaseAt(
  t: bigint,
  tradingStart: bigint,
  exerciseStart: bigint,
  exerciseEnd: bigint,
): Phase {
  if (!(tradingStart < exerciseStart && exerciseStart < exerciseEnd)) {
    throw new DomainError('INVALID_TERMS', 'require tradingStart < exerciseStart < exerciseEnd');
  }
  if (t < tradingStart) return 'scheduled';
  if (t < exerciseStart) return 'trading';
  if (t < exerciseEnd) return 'exercise';
  return 'matured';
}

export function usdcBacking6(optionUnits: bigint, strikePerUnit6: bigint): bigint {
  assertPositiveUnits(optionUnits);
  if (strikePerUnit6 <= 0n) throw new DomainError('INVALID_STRIKE', 'C must be > 0');
  return optionUnits * strikePerUnit6;
}

export function eurcDelivery6(optionUnits: bigint): bigint {
  assertPositiveUnits(optionUnits);
  return optionUnits * UNDERLYING_PER_UNIT_6;
}

export function displayedStrike(strikePerUnit6: bigint): string {
  // K = C / A with A=100 → two decimal places for integer C
  const whole = strikePerUnit6 / UNDERLYING_PER_UNIT_6;
  const frac = strikePerUnit6 % UNDERLYING_PER_UNIT_6;
  return `${whole}.${frac.toString().padStart(2, '0')}`;
}

/** Parse whole-option quantity string (up to 6 decimals) → raw units. Rejects excess precision. */
export function parseWholeOptions(input: string): bigint {
  const s = input.trim();
  if (!/^\d+(\.\d+)?$/.test(s)) throw new DomainError('INVALID_AMOUNT', 'invalid option quantity');
  const [whole, frac = ''] = s.split('.');
  if (frac.length > OPTION_DECIMALS) {
    throw new DomainError('PRECISION', `option quantity supports at most ${OPTION_DECIMALS} decimals`);
  }
  const wholePart = BigInt(whole ?? '0') * WHOLE_OPTION_SCALE;
  const fracPart = BigInt((frac ?? '').padEnd(OPTION_DECIMALS, '0') || '0');
  return wholePart + fracPart;
}

/**
 * Convert EURC exposure (up to 4 decimals) to exact raw option units.
 * Returns unprotected remainder when wallet has finer precision than contractual granularity.
 */
export function optionUnitsFromEurcExposure(exposureEurc: string): {
  optionUnits: bigint;
  coveredEurc6: bigint;
  unprotectedRemainder6: bigint;
  rejectedFinerPrecision: boolean;
} {
  const s = exposureEurc.trim();
  if (!/^\d+(\.\d+)?$/.test(s)) throw new DomainError('INVALID_AMOUNT', 'invalid EURC exposure');
  const [whole, frac = ''] = s.split('.');
  const rejectedFinerPrecision = frac.length > MAX_EURC_EXPOSURE_DECIMALS;
  const usableFrac = frac.slice(0, MAX_EURC_EXPOSURE_DECIMALS).padEnd(MAX_EURC_EXPOSURE_DECIMALS, '0');
  const discarded = frac.slice(MAX_EURC_EXPOSURE_DECIMALS);
  // EURC6 raw = whole*1e6 + usableFrac padded to 6 decimals (4 contractual + 2 zeros)
  const coveredEurc6 =
    BigInt(whole ?? '0') * 1_000_000n + BigInt(usableFrac.padEnd(UNDERLYING_DECIMALS, '0'));
  let unprotectedRemainder6 = 0n;
  if (discarded.length > 0 && /[1-9]/.test(discarded)) {
    // finer than 0.0001 EURC cannot be covered — expose remainder in raw 6-decimal units below 1e2
    unprotectedRemainder6 = BigInt(
      discarded.padEnd(UNDERLYING_DECIMALS - MAX_EURC_EXPOSURE_DECIMALS, '0'),
    );
  }
  if (coveredEurc6 % UNDERLYING_PER_UNIT_6 !== 0n) {
    throw new DomainError('PRECISION', 'EURC exposure must align to 0.0001 EURC');
  }
  const optionUnits = coveredEurc6 / UNDERLYING_PER_UNIT_6;
  return { optionUnits, coveredEurc6, unprotectedRemainder6, rejectedFinerPrecision };
}

export function formatRaw6(raw: bigint): string {
  const neg = raw < 0n;
  const v = neg ? -raw : raw;
  const whole = v / 1_000_000n;
  const frac = (v % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  const body = frac.length ? `${whole}.${frac}` : `${whole}`;
  return neg ? `-${body}` : body;
}

/** ceil(backing * feeBps / 10000) */
export function issuanceFee6(backing6: bigint, feeBps: number): bigint {
  if (feeBps < 0 || feeBps > ISSUANCE_FEE_BPS_HARD_CAP) {
    throw new DomainError('FEE_CAP', `issuanceFeeBps must be 0..${ISSUANCE_FEE_BPS_HARD_CAP}`);
  }
  if (backing6 < 0n) throw new DomainError('INVALID_AMOUNT', 'backing must be >= 0');
  if (feeBps === 0) return 0n;
  return (backing6 * BigInt(feeBps) + 9999n) / 10000n;
}

export function mintObligations(
  optionUnits: bigint,
  strikePerUnit6: bigint,
  feeBps: number,
): { collateral6: bigint; fee6: bigint; totalDebitBeforeGas6: bigint } {
  const collateral6 = usdcBacking6(optionUnits, strikePerUnit6);
  const fee6 = issuanceFee6(collateral6, feeBps);
  return { collateral6, fee6, totalDebitBeforeGas6: collateral6 + fee6 };
}

export function exerciseObligations(
  optionUnits: bigint,
  strikePerUnit6: bigint,
): { eurcIn6: bigint; usdcOut6: bigint } {
  return {
    eurcIn6: eurcDelivery6(optionUnits),
    usdcOut6: usdcBacking6(optionUnits, strikePerUnit6),
  };
}

/** Cumulative-allocation redemption preview (fixed snapshot). */
export function redeemPayout(
  writerUnitsW0: bigint,
  snapshotUsdcU0: bigint,
  snapshotEurcE0: bigint,
  redeemedSoFarR: bigint,
  claimUnitsQ: bigint,
): { usdc6: bigint; eurc6: bigint; nextR: bigint } {
  if (writerUnitsW0 < 0n || snapshotUsdcU0 < 0n || snapshotEurcE0 < 0n) {
    throw new DomainError('INVALID_SNAPSHOT', 'snapshot values must be non-negative');
  }
  assertPositiveUnits(claimUnitsQ, 'redeemUnits');
  if (redeemedSoFarR < 0n || redeemedSoFarR + claimUnitsQ > writerUnitsW0) {
    throw new DomainError('REDEEM_BOUNDS', 'claim exceeds remaining writer units');
  }
  if (writerUnitsW0 === 0n) {
    return { usdc6: 0n, eurc6: 0n, nextR: 0n };
  }
  const usdc6 =
    ((redeemedSoFarR + claimUnitsQ) * snapshotUsdcU0) / writerUnitsW0 -
    (redeemedSoFarR * snapshotUsdcU0) / writerUnitsW0;
  const eurc6 =
    ((redeemedSoFarR + claimUnitsQ) * snapshotEurcE0) / writerUnitsW0 -
    (redeemedSoFarR * snapshotEurcE0) / writerUnitsW0;
  return { usdc6, eurc6, nextR: redeemedSoFarR + claimUnitsQ };
}

/** Independent accounting model for later contract invariant tests. */
export class SeriesAccountingModel {
  writerUnits = 0n;
  exercisedUnits = 0n;
  redeemedUnits = 0n;
  accountedUsdc6 = 0n;
  accountedEurc6 = 0n;
  feePaid6 = 0n;
  finalized = false;
  snapshotW0 = 0n;
  snapshotU0 = 0n;
  snapshotE0 = 0n;

  constructor(
    readonly strikePerUnit6: bigint,
    readonly maxWriterUnits: bigint,
    readonly feeBps: number,
  ) {}

  mint(q: bigint): { collateral6: bigint; fee6: bigint } {
    assertPositiveUnits(q);
    assertSafeCap(this.writerUnits + q, this.maxWriterUnits);
    const { collateral6, fee6 } = mintObligations(q, this.strikePerUnit6, this.feeBps);
    this.writerUnits += q;
    this.accountedUsdc6 += collateral6;
    this.feePaid6 += fee6;
    return { collateral6, fee6 };
  }

  cancel(q: bigint): { returnedUsdc6: bigint } {
    assertPositiveUnits(q);
    if (this.exercisedUnits > 0n) {
      throw new DomainError('CANCEL_AFTER_EXERCISE', 'cannot cancel after exercise');
    }
    if (q > this.writerUnits) throw new DomainError('INSUFFICIENT', 'cancel exceeds writer units');
    const returnedUsdc6 = usdcBacking6(q, this.strikePerUnit6);
    this.writerUnits -= q;
    this.accountedUsdc6 -= returnedUsdc6;
    return { returnedUsdc6 };
  }

  exercise(q: bigint): { eurcIn6: bigint; usdcOut6: bigint } {
    assertPositiveUnits(q);
    const longSupply = this.writerUnits - this.exercisedUnits;
    if (q > longSupply) throw new DomainError('INSUFFICIENT', 'exercise exceeds long supply');
    const { eurcIn6, usdcOut6 } = exerciseObligations(q, this.strikePerUnit6);
    this.exercisedUnits += q;
    this.accountedUsdc6 -= usdcOut6;
    this.accountedEurc6 += eurcIn6;
    return { eurcIn6, usdcOut6 };
  }

  finalize(): void {
    if (this.finalized) return;
    this.snapshotW0 = this.writerUnits;
    this.snapshotU0 = this.accountedUsdc6;
    this.snapshotE0 = this.accountedEurc6;
    this.finalized = true;
  }

  redeem(q: bigint): { usdc6: bigint; eurc6: bigint } {
    this.finalize();
    const { usdc6, eurc6, nextR } = redeemPayout(
      this.snapshotW0,
      this.snapshotU0,
      this.snapshotE0,
      this.redeemedUnits,
      q,
    );
    this.redeemedUnits = nextR;
    this.accountedUsdc6 -= usdc6;
    this.accountedEurc6 -= eurc6;
    return { usdc6, eurc6 };
  }

  /** Donations do not mint claims or change accounted reserves. */
  noteDonation(_asset: 'USDC' | 'EURC', _amount6: bigint): void {
    // intentionally no-op on accounted counters
  }
}

export type PayoffInputs = {
  exposureEurc: bigint; // whole EURC as integer (e.g. 10000)
  strikeUsdcPerEurc: string; // e.g. "1.10"
  premiumUsdc: bigint; // whole USDC
  spotUsdcPerEurc: string;
  additionalCostsUsdc?: bigint;
  missedExercise?: boolean;
};

function parseDecimalToMicros(s: string): bigint {
  // parse as 1e6 fixed for FX prices used in educational payoffs
  const t = s.trim();
  if (!/^\d+(\.\d+)?$/.test(t)) throw new DomainError('INVALID_AMOUNT', 'invalid decimal');
  const [w, f = ''] = t.split('.');
  if (f.length > 6) throw new DomainError('PRECISION', 'price precision max 6');
  return BigInt(w ?? '0') * 1_000_000n + BigInt((f ?? '').padEnd(6, '0') || '0');
}

/** Educational payoffs in whole USDC (integer). Not settlement authority. */
export function educationalPayoffs(input: PayoffInputs): {
  unprotectedUsdc: bigint;
  protectedAfterPremiumUsdc: bigint;
  longOnlyPnLUsdc: bigint;
  writerPnLUsdc: bigint;
} {
  const N = input.exposureEurc;
  const K = parseDecimalToMicros(input.strikeUsdcPerEurc); // USDC per EURC * 1e6
  const S = parseDecimalToMicros(input.spotUsdcPerEurc);
  const P = input.premiumUsdc;
  const C = input.additionalCostsUsdc ?? 0n;
  const unprotectedUsdc = (N * S) / 1_000_000n;
  const intrinsicPerEurc = K > S ? K - S : 0n;
  const grossOption = input.missedExercise ? 0n : (N * intrinsicPerEurc) / 1_000_000n;
  const longOnlyPnLUsdc = grossOption - P - C;
  const protectedAfterPremiumUsdc = unprotectedUsdc + longOnlyPnLUsdc;
  const writerPnLUsdc = P - grossOption; // ignores C for writer panel example
  return { unprotectedUsdc, protectedAfterPremiumUsdc, longOnlyPnLUsdc, writerPnLUsdc };
}

/** Landing/hero illustrative defaults — not an executable quote. */
export const ILLUSTRATIVE_HERO = {
  kind: "illustrative" as const,
  exposureEurc: 10_000n,
  strikeUsdcPerEurc: "1.10",
  premiumUsdc: 200n,
  optionQuantityWhole: "100",
  eurcCoverage: "10000",
  usdcOnExercise: "11000",
  exerciseWindowLabel: "Example window (not a live listing)",
  note: "Illustrative example — not an executable quote",
};

/** Writer panel: 11,000 USDC backing, all exercised at spot 1.00 → illustrative 800 USDC loss. */
export const ILLUSTRATIVE_WRITER_LOSS = {
  kind: "illustrative" as const,
  backingUsdc: 11_000n,
  premiumReceivedUsdc: 200n,
  eurcReturned: 10_000n,
  spotUsdcPerEurc: "1.00",
  eurcMarkUsdc: 10_000n,
  illustrativeLossUsdc: 800n,
  note: "Illustrative writer downside — not a live P&L or APY",
};

export type ReferenceMarkStatus =
  | { status: "unavailable"; reason: string; pair: string; price: null }
  | {
      status: "available";
      pair: string;
      price: string;
      units: string;
      source: string;
      observedAt: string;
      stale: boolean;
      method?: string;
    };

export function referenceMarkUnavailable(
  pair = "EURC_USDC",
): Extract<ReferenceMarkStatus, { status: "unavailable" }> {
  return {
    status: "unavailable",
    pair,
    price: null,
    reason: "No verified reference-mark provider configured",
  };
}

export type PortfolioValueHonesty =
  | { kind: "unavailable"; reason: string }
  | { kind: "illustrative"; valueUsdc: string; note: string }
  | { kind: "estimated"; valueUsdc: string; provenance: string; stale: boolean }
  | { kind: "actual"; valueUsdc: string; blockNumber: string };

export function unquotedActiveOptionValue(): PortfolioValueHonesty {
  return {
    kind: "unavailable",
    reason: "No executable quote — value is not shown as zero",
  };
}

export type PayoffChartPoint = {
  spotUsdcPerEurc: string;
  unprotectedUsdc: string;
  protectedAfterPremiumUsdc: string;
  longOnlyPnLUsdc: string;
  writerPnLUsdc: string;
};

export type PayoffChartSeries = {
  kind: "illustrative";
  assumptions: {
    exposureEurc: string;
    strikeUsdcPerEurc: string;
    premiumUsdc: string;
    additionalCostsUsdc: string;
    missedExercise: boolean;
  };
  points: PayoffChartPoint[];
  summary: string;
};

const DEFAULT_EDU_SPOTS = ["0.90", "1.00", "1.05", "1.10", "1.15", "1.20", "1.30"];

/** Chart/table series from integer domain math; SVG may use floats only after this. */
export function buildEducationalPayoffSeries(input: {
  exposureEurc?: bigint;
  strikeUsdcPerEurc?: string;
  premiumUsdc?: bigint;
  additionalCostsUsdc?: bigint;
  missedExercise?: boolean;
  spots?: string[];
} = {}): PayoffChartSeries {
  const exposureEurc = input.exposureEurc ?? ILLUSTRATIVE_HERO.exposureEurc;
  const strikeUsdcPerEurc = input.strikeUsdcPerEurc ?? ILLUSTRATIVE_HERO.strikeUsdcPerEurc;
  const premiumUsdc = input.premiumUsdc ?? ILLUSTRATIVE_HERO.premiumUsdc;
  const additionalCostsUsdc = input.additionalCostsUsdc ?? 0n;
  const missedExercise = Boolean(input.missedExercise);
  const spots = input.spots ?? DEFAULT_EDU_SPOTS;

  const points: PayoffChartPoint[] = spots.map((spot) => {
    const base: PayoffInputs = {
      exposureEurc,
      strikeUsdcPerEurc,
      premiumUsdc,
      spotUsdcPerEurc: spot,
      missedExercise,
    };
    if (additionalCostsUsdc !== 0n) {
      base.additionalCostsUsdc = additionalCostsUsdc;
    }
    const out = educationalPayoffs(base);
    return {
      spotUsdcPerEurc: spot,
      unprotectedUsdc: out.unprotectedUsdc.toString(),
      protectedAfterPremiumUsdc: out.protectedAfterPremiumUsdc.toString(),
      longOnlyPnLUsdc: out.longOnlyPnLUsdc.toString(),
      writerPnLUsdc: out.writerPnLUsdc.toString(),
    };
  });

  const atOne = points.find((p) => p.spotUsdcPerEurc === "1.00");
  const summary = missedExercise
    ? `Missed exercise: option component is zero; premium ${premiumUsdc.toString()} USDC remains spent.`
    : atOne
      ? `At 1.00 USDC/EURC, protected holding after ${premiumUsdc.toString()} USDC premium is ${atOne.protectedAfterPremiumUsdc} USDC (illustrative).`
      : "Illustrative payoff series — not executable.";

  return {
    kind: "illustrative",
    assumptions: {
      exposureEurc: exposureEurc.toString(),
      strikeUsdcPerEurc,
      premiumUsdc: premiumUsdc.toString(),
      additionalCostsUsdc: additionalCostsUsdc.toString(),
      missedExercise,
    },
    points,
    summary,
  };
}

export function assertWriterIllustrativeLoss(): void {
  const out = educationalPayoffs({
    exposureEurc: ILLUSTRATIVE_HERO.exposureEurc,
    strikeUsdcPerEurc: ILLUSTRATIVE_HERO.strikeUsdcPerEurc,
    premiumUsdc: ILLUSTRATIVE_HERO.premiumUsdc,
    spotUsdcPerEurc: "1.00",
  });
  if (out.writerPnLUsdc !== -ILLUSTRATIVE_WRITER_LOSS.illustrativeLossUsdc) {
    throw new DomainError(
      "FIXTURE",
      `expected writer PnL -${ILLUSTRATIVE_WRITER_LOSS.illustrativeLossUsdc}, got ${out.writerPnLUsdc}`,
    );
  }
  const recovered =
    ILLUSTRATIVE_WRITER_LOSS.eurcMarkUsdc + ILLUSTRATIVE_WRITER_LOSS.premiumReceivedUsdc;
  const loss = ILLUSTRATIVE_WRITER_LOSS.backingUsdc - recovered;
  if (loss !== ILLUSTRATIVE_WRITER_LOSS.illustrativeLossUsdc) {
    throw new DomainError("FIXTURE", "writer backing arithmetic drifted");
  }
}
