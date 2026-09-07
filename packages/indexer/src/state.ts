/**
 * In-memory projection store for fixture/Anvil replay (O12).
 * Postgres persistence uses the same shapes via packages/database queries.
 */

export type SeriesRow = {
  seriesId: `0x${string}`;
  vault: `0x${string}`;
  longToken: `0x${string}`;
  writerReceipt: `0x${string}`;
  strikePerUnit6: bigint;
  tradingStart: bigint;
  exerciseStart: bigint;
  exerciseEnd: bigint;
  maxWriterUnits: bigint;
  issuanceFeeBps: number;
  paused: boolean;
  creationBlock: bigint;
};

export type AccountingRow = {
  seriesId: `0x${string}`;
  writerUnits: bigint;
  exercisedUnits: bigint;
  redeemedUnits: bigint;
  accountedUsdc6: bigint;
  accountedEurc6: bigint;
  snapshotWriterUnits: bigint | null;
  snapshotUsdc6: bigint | null;
  snapshotEurc6: bigint | null;
  asOfBlock: bigint;
  asOfHash: `0x${string}`;
};

export type BalanceKey = string; // `${token}:${holder}`
export type TradeFill = {
  seriesId: `0x${string}`;
  poolId: `0x${string}`;
  side: "buy" | "sell";
  optionUnits: bigint;
  usdc6: bigint;
  account: `0x${string}`;
  provenance: "router";
  txHash: `0x${string}`;
  logIndex: number;
};

export type LpPosition = {
  positionManager: `0x${string}`;
  tokenId: bigint;
  owner: `0x${string}`;
  poolId: `0x${string}` | null;
  asOfBlock: bigint;
};

export type PoolRow = {
  seriesId: `0x${string}`;
  poolId: `0x${string}`;
  vault: `0x${string}`;
  currency0: `0x${string}`;
  currency1: `0x${string}`;
  fee: number;
  tickSpacing: number;
  sqrtPriceX96: bigint;
  registrationBlock: bigint;
};

export type IndexerCheckpoint = {
  chainId: number;
  generation: number;
  lastBlock: bigint;
  lastBlockHash: `0x${string}`;
  status: "ok" | "needs_reconciliation" | "reset";
};

export type IndexerState = {
  chainId: number;
  generation: number;
  sourceLabel: "fixture" | "anvil" | "arc-rpc";
  series: Map<string, SeriesRow>;
  accounting: Map<string, AccountingRow>;
  pools: Map<string, PoolRow>;
  balances: Map<BalanceKey, bigint>;
  eventKeys: Set<string>;
  trades: TradeFill[];
  lp: Map<string, LpPosition>;
  checkpoint: IndexerCheckpoint | null;
  lastTimestamp: bigint;
};

export function createIndexerState(
  chainId: number,
  sourceLabel: IndexerState["sourceLabel"] = "fixture",
  generation = 1,
): IndexerState {
  return {
    chainId,
    generation,
    sourceLabel,
    series: new Map(),
    accounting: new Map(),
    pools: new Map(),
    balances: new Map(),
    eventKeys: new Set(),
    trades: [],
    lp: new Map(),
    checkpoint: null,
    lastTimestamp: 0n,
  };
}

export function eventKey(
  blockHash: string,
  txHash: string,
  logIndex: number,
): string {
  return `${blockHash}:${txHash}:${logIndex}`;
}

export function balanceKey(token: string, holder: string): BalanceKey {
  return `${token.toLowerCase()}:${holder.toLowerCase()}`;
}
