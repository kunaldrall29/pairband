/** SDK helpers for Pairband narrow router — not Universal Router. Not audited. */

export type ManifestMode = 'preview' | 'testnet' | 'mainnet';

export interface DeploymentManifest {
  schemaVersion: number;
  mode: ManifestMode;
  verified: boolean;
  chainId: number | null;
  /** Pairband-deployed PoolManager — never claim official Uniswap Arc without listing proof */
  poolManager?: `0x${string}` | null;
  pairbandRouter?: `0x${string}` | null;
  pairbandQuoter?: `0x${string}` | null;
}

export function assertManifestAllowsActions(manifest: DeploymentManifest): void {
  if (!manifest.verified) {
    throw new Error('Deployment manifest is not verified; financial actions blocked');
  }
  if (manifest.mode === 'preview') {
    throw new Error('Preview mode cannot prepare financial transactions');
  }
  if (manifest.mode === 'mainnet' && manifest.chainId == null) {
    throw new Error('Mainnet chainId is null until verified');
  }
}

/** Function selectors for PairbandRouter (solc 0.8 ABI). */
export const ROUTER_SELECTORS = {
  buyExactOutput: '0x' as string, // filled via encode below
  sellExactInput: '0x' as string,
} as const;

const BUY_SIG =
  'buyExactOutput(bytes32,uint256,uint256,uint256)' as const;
const SELL_SIG =
  'sellExactInput(bytes32,uint256,uint256,uint256)' as const;

/** Encode buyExactOutput calldata. optionUnits and maxUSDC6 are raw 6-decimal integers. */
export function encodeBuyExactOutput(args: {
  seriesId: `0x${string}`;
  optionUnits: bigint;
  maxUSDC6: bigint;
  deadline: bigint;
}): { signature: typeof BUY_SIG; args: readonly [string, bigint, bigint, bigint] } {
  if (args.optionUnits <= 0n || args.maxUSDC6 <= 0n) {
    throw new Error('optionUnits and maxUSDC6 must be positive');
  }
  return {
    signature: BUY_SIG,
    args: [args.seriesId, args.optionUnits, args.maxUSDC6, args.deadline],
  };
}

export function encodeSellExactInput(args: {
  seriesId: `0x${string}`;
  optionUnits: bigint;
  minUSDC6: bigint;
  deadline: bigint;
}): { signature: typeof SELL_SIG; args: readonly [string, bigint, bigint, bigint] } {
  if (args.optionUnits <= 0n) {
    throw new Error('optionUnits must be positive');
  }
  return {
    signature: SELL_SIG,
    args: [args.seriesId, args.optionUnits, args.minUSDC6, args.deadline],
  };
}

/**
 * Decode PairbandQuoter QuoteResult from eth_call revert data (4-byte selector + ABI args).
 * Quote is not a guarantee — resimulate before signing.
 */
export function decodeQuoteResult(revertDataHex: string): {
  usdc6: bigint;
  optionUnits6: bigint;
  isBuy: boolean;
  poolId: `0x${string}`;
  blockNumber: bigint;
} {
  const hex = revertDataHex.startsWith('0x') ? revertDataHex.slice(2) : revertDataHex;
  // QuoteResult(uint256,uint256,bool,bytes32,uint256) selector = keccak first 4 bytes
  // For tests we accept raw ABI payload after selector
  if (hex.length < 8 + 64 * 5) {
    throw new Error('revert data too short for QuoteResult');
  }
  const payload = hex.slice(8);
  const word = (i: number) => BigInt('0x' + payload.slice(i * 64, i * 64 + 64));
  return {
    usdc6: word(0),
    optionUnits6: word(1),
    isBuy: word(2) !== 0n,
    poolId: (`0x${payload.slice(3 * 64, 3 * 64 + 64)}`) as `0x${string}`,
    blockNumber: word(4),
  };
}

/** Convert whole options (human) to raw 6-decimal units. */
export function wholeOptionsToRaw6(whole: number | string): bigint {
  const s = String(whole);
  if (!/^\d+(\.\d{1,6})?$/.test(s)) throw new Error('invalid whole option amount');
  const [a, b = ''] = s.split('.');
  return BigInt(a) * 10n ** 6n + BigInt(b.padEnd(6, '0'));
}

/**
 * Option premium as USDC per whole option from raw swap amounts (6 decimals each).
 * This is NOT an EURC/USDC FX spot price.
 */
export function usdcPerWholeOption(usdcRaw6: bigint, optionUnitsRaw6: bigint): number {
  if (optionUnitsRaw6 === 0n) throw new Error('zero options');
  // both 6 decimals → ratio is dimensionless USDC/option in human units
  return Number(usdcRaw6) / Number(optionUnitsRaw6);
}
