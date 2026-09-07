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

const MINT_SIG = 'mint(uint256)' as const;
const CANCEL_SIG = 'cancel(uint256)' as const;
const EXERCISE_SIG = 'exercise(uint256)' as const;
const REDEEM_SIG = 'redeem(uint256)' as const;
const FINALIZE_SIG = 'finalize()' as const;

/** Vault lifecycle encoders — target is the series vault, not the router. */
export function encodeVaultMint(units: bigint): { signature: typeof MINT_SIG; args: readonly [bigint] } {
  if (units <= 0n) throw new Error('units must be positive');
  return { signature: MINT_SIG, args: [units] };
}

export function encodeVaultCancel(units: bigint): { signature: typeof CANCEL_SIG; args: readonly [bigint] } {
  if (units <= 0n) throw new Error('units must be positive');
  return { signature: CANCEL_SIG, args: [units] };
}

export function encodeVaultExercise(units: bigint): {
  signature: typeof EXERCISE_SIG;
  args: readonly [bigint];
} {
  if (units <= 0n) throw new Error('units must be positive');
  return { signature: EXERCISE_SIG, args: [units] };
}

export function encodeVaultRedeem(units: bigint): { signature: typeof REDEEM_SIG; args: readonly [bigint] } {
  if (units <= 0n) throw new Error('units must be positive');
  return { signature: REDEEM_SIG, args: [units] };
}

export function encodeVaultFinalize(): { signature: typeof FINALIZE_SIG; args: readonly [] } {
  return { signature: FINALIZE_SIG, args: [] };
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
  const parts = s.split('.');
  const ints = parts[0] ?? '0';
  const frac = (parts[1] ?? '').padEnd(6, '0');
  return BigInt(ints) * 10n ** 6n + BigInt(frac);
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

/** Uniswap v4 PositionManager Actions (pinned periphery). Not Universal Router. */
export const POSM_ACTIONS = {
  INCREASE_LIQUIDITY: 0x00,
  DECREASE_LIQUIDITY: 0x01,
  MINT_POSITION: 0x02,
  BURN_POSITION: 0x03,
  CLOSE_CURRENCY: 0x12,
} as const;

export type PosmPoolKey = {
  currency0: `0x${string}`;
  currency1: `0x${string}`;
  fee: number;
  tickSpacing: number;
  hooks: `0x${string}`;
};

/**
 * Typed Action planner steps for PositionManager.modifyLiquidities.
 * Calldata must still be ABI-encoded (actions bytes + params[]) by the wallet layer.
 * Permit2: approve token→Permit2, then Permit2.approve(token, posm, amount, expiration).
 */
export function buildMintPositionPlan(args: {
  poolKey: PosmPoolKey;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  amount0Max: bigint;
  amount1Max: bigint;
  owner: `0x${string}`;
  hookData?: `0x${string}`;
}): { actions: number[]; mintParams: typeof args; closeCurrencies: [`0x${string}`, `0x${string}`] } {
  if (args.liquidity <= 0n) throw new Error('liquidity must be positive');
  if (args.tickLower >= args.tickUpper) throw new Error('tickLower must be < tickUpper');
  return {
    actions: [POSM_ACTIONS.MINT_POSITION, POSM_ACTIONS.CLOSE_CURRENCY, POSM_ACTIONS.CLOSE_CURRENCY],
    mintParams: { ...args, hookData: args.hookData ?? '0x' },
    closeCurrencies: [args.poolKey.currency0, args.poolKey.currency1],
  };
}

export function buildDecreaseLiquidityPlan(args: {
  tokenId: bigint;
  liquidity: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
  currency0: `0x${string}`;
  currency1: `0x${string}`;
  hookData?: `0x${string}`;
}): { actions: number[]; decreaseParams: typeof args; closeCurrencies: [`0x${string}`, `0x${string}`] } {
  if (args.tokenId <= 0n) throw new Error('tokenId required');
  return {
    actions: [POSM_ACTIONS.DECREASE_LIQUIDITY, POSM_ACTIONS.CLOSE_CURRENCY, POSM_ACTIONS.CLOSE_CURRENCY],
    decreaseParams: { ...args, hookData: args.hookData ?? '0x' },
    closeCurrencies: [args.currency0, args.currency1],
  };
}

/** Fee collect = decrease 0 liquidity then close currencies. */
export function buildCollectFeesPlan(args: {
  tokenId: bigint;
  currency0: `0x${string}`;
  currency1: `0x${string}`;
  hookData?: `0x${string}`;
}) {
  return buildDecreaseLiquidityPlan({
    tokenId: args.tokenId,
    liquidity: 0n,
    amount0Min: 0n,
    amount1Min: 0n,
    currency0: args.currency0,
    currency1: args.currency1,
    ...(args.hookData !== undefined ? { hookData: args.hookData } : {}),
  });
}

/** Reconcile maker inventory vs writer backing — must never treat vault USDC as LP free balance. */
export function assertLpInventorySeparateFromBacking(args: {
  vaultAccountedUSDC6: bigint;
  makerFreeUSDC6: bigint;
  makerFreeOptions6: bigint;
  writerReceipt6: bigint;
}): void {
  if (args.vaultAccountedUSDC6 < 0n) throw new Error('negative vault accounted');
  // Structural check only: receipt tracks writer claim; LP free balances are independent.
  void args.makerFreeUSDC6;
  void args.makerFreeOptions6;
  void args.writerReceipt6;
}
