import type { Hex, Log } from "viem";
import { decodePairbandLog, sortLogs } from "./decode.js";
import {
  balanceKey,
  createIndexerState,
  eventKey,
  type AccountingRow,
  type IndexerState,
  type PoolRow,
  type SeriesRow,
} from "./state.js";

export type BlockMeta = {
  number: bigint;
  hash: Hex;
  parentHash: Hex;
  timestamp: bigint;
};

export type IngestBatch = {
  blocks: BlockMeta[];
  logs: Log[];
};

function ensureAccounting(state: IndexerState, seriesId: `0x${string}`, block: bigint, hash: Hex): AccountingRow {
  const id = seriesId.toLowerCase();
  let row = state.accounting.get(id);
  if (!row) {
    row = {
      seriesId,
      writerUnits: 0n,
      exercisedUnits: 0n,
      redeemedUnits: 0n,
      accountedUsdc6: 0n,
      accountedEurc6: 0n,
      snapshotWriterUnits: null,
      snapshotUsdc6: null,
      snapshotEurc6: null,
      asOfBlock: block,
      asOfHash: hash,
    };
    state.accounting.set(id, row);
  }
  row.asOfBlock = block;
  row.asOfHash = hash;
  return row;
}

function applyTransfer(state: IndexerState, token: `0x${string}`, from: `0x${string}`, to: `0x${string}`, value: bigint) {
  const zero = "0x0000000000000000000000000000000000000000";
  if (from.toLowerCase() !== zero) {
    const k = balanceKey(token, from);
    state.balances.set(k, (state.balances.get(k) ?? 0n) - value);
  }
  if (to.toLowerCase() !== zero) {
    const k = balanceKey(token, to);
    state.balances.set(k, (state.balances.get(k) ?? 0n) + value);
  }
}

/**
 * Replay logs into projections. Duplicate event keys are ignored.
 * Conflicting block hash at an existing checkpoint height → needs_reconciliation.
 */
export function ingestBatch(state: IndexerState, batch: IngestBatch): {
  applied: number;
  duplicates: number;
  status: IndexerState["checkpoint"] extends null ? never : NonNullable<IndexerState["checkpoint"]>["status"];
} {
  let applied = 0;
  let duplicates = 0;
  let status: "ok" | "needs_reconciliation" | "reset" = state.checkpoint?.status ?? "ok";

  const blocksByNumber = new Map(batch.blocks.map((b) => [b.number.toString(), b]));
  const logs = sortLogs(batch.logs);

  for (const log of logs) {
    const bn = log.blockNumber ?? 0n;
    const bh = (log.blockHash ?? "0x") as Hex;
    const tx = (log.transactionHash ?? "0x") as Hex;
    const li = log.logIndex ?? 0;
    const key = eventKey(bh, tx, li);

    if (state.checkpoint && bn <= state.checkpoint.lastBlock) {
      // same height different hash → reconciliation required
      if (
        bn === state.checkpoint.lastBlock &&
        bh.toLowerCase() !== state.checkpoint.lastBlockHash.toLowerCase()
      ) {
        status = "needs_reconciliation";
        state.checkpoint = { ...state.checkpoint, status };
        continue;
      }
    }

    if (state.eventKeys.has(key)) {
      duplicates += 1;
      continue;
    }
    state.eventKeys.add(key);

    const blockMeta = blocksByNumber.get(bn.toString());
    const ts = blockMeta?.timestamp ?? state.lastTimestamp;
    if (ts < state.lastTimestamp) {
      // non-decreasing timestamps expected; record but continue ordered by block/log
      status = status === "ok" ? "ok" : status;
    } else {
      state.lastTimestamp = ts;
    }

    const decoded = decodePairbandLog(log);
    const seriesId = decoded.args.seriesId as `0x${string}` | undefined;

    switch (decoded.name) {
      case "SeriesCreated": {
        const row: SeriesRow = {
          seriesId: decoded.args.seriesId as `0x${string}`,
          vault: decoded.args.vault as `0x${string}`,
          longToken: decoded.args.longToken as `0x${string}`,
          writerReceipt: decoded.args.writerReceipt as `0x${string}`,
          strikePerUnit6: decoded.args.strikePerUnit6 as bigint,
          tradingStart: BigInt(decoded.args.tradingStart as bigint | number),
          exerciseStart: BigInt(decoded.args.exerciseStart as bigint | number),
          exerciseEnd: BigInt(decoded.args.exerciseEnd as bigint | number),
          maxWriterUnits: decoded.args.maxWriterUnits as bigint,
          issuanceFeeBps: Number(decoded.args.issuanceFeeBps),
          paused: false,
          creationBlock: bn,
        };
        state.series.set(row.seriesId.toLowerCase(), row);
        ensureAccounting(state, row.seriesId, bn, bh);
        break;
      }
      case "NewRiskPauseChanged": {
        const s = state.series.get((seriesId as string).toLowerCase());
        if (s) s.paused = Boolean(decoded.args.paused);
        break;
      }
      case "OptionsMinted": {
        const acc = ensureAccounting(state, seriesId!, bn, bh);
        const units = decoded.args.units as bigint;
        const collateral6 = decoded.args.collateral6 as bigint;
        acc.writerUnits += units;
        acc.accountedUsdc6 += collateral6;
        break;
      }
      case "OptionsCancelled": {
        const acc = ensureAccounting(state, seriesId!, bn, bh);
        const units = decoded.args.units as bigint;
        const returned = decoded.args.returnedUSDC6 as bigint;
        acc.writerUnits -= units;
        acc.accountedUsdc6 -= returned;
        break;
      }
      case "OptionsExercised": {
        const acc = ensureAccounting(state, seriesId!, bn, bh);
        const units = decoded.args.units as bigint;
        acc.exercisedUnits += units;
        acc.accountedUsdc6 -= decoded.args.usdcOut6 as bigint;
        acc.accountedEurc6 += decoded.args.eurcIn6 as bigint;
        break;
      }
      case "SeriesFinalized": {
        const acc = ensureAccounting(state, seriesId!, bn, bh);
        acc.snapshotWriterUnits = decoded.args.writerUnits as bigint;
        acc.snapshotUsdc6 = decoded.args.usdc6 as bigint;
        acc.snapshotEurc6 = decoded.args.eurc6 as bigint;
        break;
      }
      case "WriterRedeemed": {
        const acc = ensureAccounting(state, seriesId!, bn, bh);
        const units = decoded.args.units as bigint;
        acc.redeemedUnits += units;
        acc.accountedUsdc6 -= decoded.args.usdcOut6 as bigint;
        acc.accountedEurc6 -= decoded.args.eurcOut6 as bigint;
        break;
      }
      case "Bought": {
        state.trades.push({
          seriesId: seriesId!,
          poolId: decoded.args.poolId as `0x${string}`,
          side: "buy",
          optionUnits: decoded.args.optionUnits as bigint,
          usdc6: decoded.args.usdcPaid6 as bigint,
          account: decoded.args.account as `0x${string}`,
          provenance: "router",
          txHash: tx,
          logIndex: li,
        });
        break;
      }
      case "Sold": {
        state.trades.push({
          seriesId: seriesId!,
          poolId: decoded.args.poolId as `0x${string}`,
          side: "sell",
          optionUnits: decoded.args.optionUnits as bigint,
          usdc6: decoded.args.usdcReceived6 as bigint,
          account: decoded.args.account as `0x${string}`,
          provenance: "router",
          txHash: tx,
          logIndex: li,
        });
        break;
      }
      case "Transfer": {
        applyTransfer(
          state,
          decoded.emitter,
          decoded.args.from as `0x${string}`,
          decoded.args.to as `0x${string}`,
          decoded.args.value as bigint,
        );
        break;
      }
      case "MarketRegistered": {
        const pool: PoolRow = {
          seriesId: decoded.args.seriesId as `0x${string}`,
          poolId: decoded.args.poolId as `0x${string}`,
          vault: decoded.args.vault as `0x${string}`,
          currency0: decoded.args.currency0 as `0x${string}`,
          currency1: decoded.args.currency1 as `0x${string}`,
          fee: Number(decoded.args.fee),
          tickSpacing: Number(decoded.args.tickSpacing),
          sqrtPriceX96: decoded.args.sqrtPriceX96 as bigint,
          registrationBlock: bn,
        };
        state.pools.set(pool.poolId.toLowerCase(), pool);
        break;
      }
      default:
        break;
    }
    applied += 1;
  }

  if (batch.blocks.length > 0) {
    const last = [...batch.blocks].sort((a, b) => Number(a.number - b.number)).at(-1)!;
    state.checkpoint = {
      chainId: state.chainId,
      generation: state.generation,
      lastBlock: last.number,
      lastBlockHash: last.hash,
      status,
    };
  }

  return { applied, duplicates, status };
}

/** Full rebuild from empty state — used to prove replay equivalence. */
export function replayAll(
  chainId: number,
  batches: IngestBatch[],
  sourceLabel: IndexerState["sourceLabel"] = "fixture",
): IndexerState {
  const state = createIndexerState(chainId, sourceLabel);
  for (const batch of batches) {
    const result = ingestBatch(state, batch);
    if (result.status === "needs_reconciliation") {
      // stop applying conflicting history; caller must reset generation
      break;
    }
  }
  return state;
}

export function startNewGeneration(prev: IndexerState): IndexerState {
  const next = createIndexerState(prev.chainId, prev.sourceLabel, prev.generation + 1);
  next.checkpoint = {
    chainId: prev.chainId,
    generation: next.generation,
    lastBlock: 0n,
    lastBlockHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    status: "reset",
  };
  return next;
}
