/** Shared option unit constants — full math arrives in O02. */
export const OPTION_DECIMALS = 6;
export const UNDERLYING_PER_UNIT_6 = 100n;
export const DEFAULT_STRIKE_PER_UNIT_6 = 110n;

export type Phase = 'scheduled' | 'trading' | 'exercise' | 'matured';

export function phaseAt(
  t: bigint,
  tradingStart: bigint,
  exerciseStart: bigint,
  exerciseEnd: bigint,
): Phase {
  if (t < tradingStart) return 'scheduled';
  if (t < exerciseStart) return 'trading';
  if (t < exerciseEnd) return 'exercise';
  return 'matured';
}

export function usdcBacking6(optionUnits: bigint, strikePerUnit6: bigint): bigint {
  return optionUnits * strikePerUnit6;
}

export function eurcDelivery6(optionUnits: bigint): bigint {
  return optionUnits * UNDERLYING_PER_UNIT_6;
}
