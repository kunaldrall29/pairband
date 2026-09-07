import { formatRaw6 } from "@pairband/domain";

export type AmountUnit =
  | "USDC"
  | "EURC"
  | "option"
  | "raw6"
  | "USDC_per_EURC"
  | "USDC_per_option";

/** Format integer-string or bigint amounts without inventing precision. */
export function formatAmount(
  raw: bigint | string,
  unit: AmountUnit,
  opts: { decimals?: number; compact?: boolean } = {},
): string {
  const value = typeof raw === "string" ? BigInt(raw) : raw;
  if (unit === "raw6" || unit === "USDC" || unit === "EURC" || unit === "option") {
    const formatted = formatRaw6(value);
    const label =
      unit === "raw6" ? "raw" : unit === "option" ? "options" : unit;
    return `${formatted} ${label}`;
  }
  // Prices are already decimal strings in domain helpers elsewhere; here accept micros.
  const asDecimal = formatRaw6(value);
  if (unit === "USDC_per_EURC") return `${asDecimal} USDC/EURC`;
  if (unit === "USDC_per_option") return `${asDecimal} USDC/option`;
  return `${asDecimal}${opts.decimals !== undefined ? "" : ""}`;
}

export function stripTrailingZeros(decimal: string): string {
  if (!decimal.includes(".")) return decimal;
  return decimal.replace(/\.?0+$/, "");
}
