/**
 * Pure deterministic band suggestion. NEVER let an LLM choose ticks.
 *
 * lower = floor((tick - width/2) / spacing) * spacing
 * upper = lower + width
 * then clip to maxShift vs currentBand (BandMath.shift = |ΔL|+|ΔU|).
 */
export type Band = { tickLower: number; tickUpper: number };

export type SuggestBandInput = {
  tick: number;
  spacing: number;
  maxWidth: number;
  maxShift: number;
  currentBand: Band;
  /** Desired width in ticks; floored to spacing. Defaults to maxWidth. */
  desiredWidth?: number;
};

export function alignDown(tick: number, spacing: number): number {
  let compressed = Math.trunc(tick / spacing);
  if (tick < 0 && tick % spacing !== 0) compressed -= 1;
  return compressed * spacing;
}

export function width(band: Band): number {
  return band.tickUpper - band.tickLower;
}

/** Shift := |Δlower| + |Δupper| */
export function shift(a: Band, b: Band): number {
  return Math.abs(b.tickLower - a.tickLower) + Math.abs(b.tickUpper - a.tickUpper);
}

export function suggestBand(input: SuggestBandInput): Band {
  const { tick, spacing, maxWidth, maxShift, currentBand } = input;
  if (spacing <= 0) throw new Error("spacing must be > 0");

  let w = input.desiredWidth ?? maxWidth;
  w = w - (w % spacing);
  if (w <= 0) w = spacing;
  if (w > maxWidth) w = maxWidth - (maxWidth % spacing);

  const half = Math.floor(w / 2);
  let tickLower = alignDown(tick - half, spacing);
  let tickUpper = tickLower + w;

  if (tick < tickLower) {
    tickLower -= spacing;
    tickUpper -= spacing;
  } else if (tick >= tickUpper) {
    tickLower += spacing;
    tickUpper += spacing;
  }

  let proposed: Band = { tickLower, tickUpper };
  const s = shift(currentBand, proposed);
  if (s <= maxShift) return proposed;

  // Scale edge deltas to fit maxShift (mirrors BandMath.clipToMaxShift).
  if (s === 0 || maxShift === 0) return { ...currentBand };
  const dL = proposed.tickLower - currentBand.tickLower;
  const dU = proposed.tickUpper - currentBand.tickUpper;
  const scaled: Band = {
    tickLower: currentBand.tickLower + Math.trunc((dL * maxShift) / s),
    tickUpper: currentBand.tickUpper + Math.trunc((dU * maxShift) / s),
  };
  if (scaled.tickUpper <= scaled.tickLower) return { ...currentBand };
  // Re-align
  scaled.tickLower = alignDown(scaled.tickLower, spacing);
  scaled.tickUpper = alignDown(scaled.tickUpper, spacing);
  if (scaled.tickUpper <= scaled.tickLower) scaled.tickUpper = scaled.tickLower + spacing;
  return scaled;
}
