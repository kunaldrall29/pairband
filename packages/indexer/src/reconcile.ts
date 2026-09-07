/**
 * Independent reserve reconciliation (O12).
 * Compare indexer projections to an RPC-shaped snapshot. Never invent balances.
 */

import type { AccountingRow, IndexerState } from "./state.js";

export type RpcSeriesSnapshot = {
  seriesId: `0x${string}`;
  writerUnits: bigint;
  exercisedUnits: bigint;
  redeemedUnits: bigint;
  accountedUsdc6: bigint;
  accountedEurc6: bigint;
  longSupply: bigint;
  receiptSupply: bigint;
  vaultUsdcBalance6: bigint;
  vaultEurcBalance6: bigint;
  asOfBlock: bigint;
  asOfHash: `0x${string}`;
};

export type ReconcileIssue = {
  seriesId: `0x${string}`;
  field: string;
  projected: string;
  observed: string;
  severity: "mismatch" | "donation_detected" | "stale";
};

export type ReconcileReport = {
  ok: boolean;
  sourceLabel: IndexerState["sourceLabel"];
  issues: ReconcileIssue[];
  checkedSeries: number;
};

function accEq(a: bigint, b: bigint): boolean {
  return a === b;
}

export function reconcileSeries(
  projected: AccountingRow | undefined,
  rpc: RpcSeriesSnapshot,
): ReconcileIssue[] {
  const issues: ReconcileIssue[] = [];
  const sid = rpc.seriesId;
  if (!projected) {
    issues.push({
      seriesId: sid,
      field: "projection",
      projected: "missing",
      observed: "present",
      severity: "mismatch",
    });
    return issues;
  }

  const checks: [string, bigint, bigint][] = [
    ["writerUnits", projected.writerUnits, rpc.writerUnits],
    ["exercisedUnits", projected.exercisedUnits, rpc.exercisedUnits],
    ["redeemedUnits", projected.redeemedUnits, rpc.redeemedUnits],
    ["accountedUsdc6", projected.accountedUsdc6, rpc.accountedUsdc6],
    ["accountedEurc6", projected.accountedEurc6, rpc.accountedEurc6],
  ];
  for (const [field, p, o] of checks) {
    if (!accEq(p, o)) {
      issues.push({
        seriesId: sid,
        field,
        projected: p.toString(),
        observed: o.toString(),
        severity: "mismatch",
      });
    }
  }

  // Donations: vault ERC20 balance may exceed accounted reserves — report, do not mint claims.
  if (rpc.vaultUsdcBalance6 > rpc.accountedUsdc6) {
    issues.push({
      seriesId: sid,
      field: "vaultUsdcBalance6",
      projected: rpc.accountedUsdc6.toString(),
      observed: rpc.vaultUsdcBalance6.toString(),
      severity: "donation_detected",
    });
  }
  if (rpc.vaultEurcBalance6 > rpc.accountedEurc6) {
    issues.push({
      seriesId: sid,
      field: "vaultEurcBalance6",
      projected: rpc.accountedEurc6.toString(),
      observed: rpc.vaultEurcBalance6.toString(),
      severity: "donation_detected",
    });
  }

  // Long supply should equal writerUnits - exercisedUnits
  const expectedLong = rpc.writerUnits - rpc.exercisedUnits;
  if (rpc.longSupply !== expectedLong) {
    issues.push({
      seriesId: sid,
      field: "longSupply",
      projected: expectedLong.toString(),
      observed: rpc.longSupply.toString(),
      severity: "mismatch",
    });
  }

  if (projected.asOfBlock < rpc.asOfBlock) {
    issues.push({
      seriesId: sid,
      field: "asOfBlock",
      projected: projected.asOfBlock.toString(),
      observed: rpc.asOfBlock.toString(),
      severity: "stale",
    });
  }

  return issues;
}

export function reconcileState(
  state: IndexerState,
  snapshots: RpcSeriesSnapshot[],
): ReconcileReport {
  const issues: ReconcileIssue[] = [];
  for (const snap of snapshots) {
    const projected = state.accounting.get(snap.seriesId.toLowerCase());
    issues.push(...reconcileSeries(projected, snap));
  }
  const hard = issues.filter((i) => i.severity === "mismatch");
  return {
    ok: hard.length === 0,
    sourceLabel: state.sourceLabel,
    issues,
    checkedSeries: snapshots.length,
  };
}

export function indexerLag(args: {
  indexedThroughBlock: bigint;
  tipBlock: bigint;
}): { lagBlocks: bigint; stale: boolean } {
  const lag = args.tipBlock > args.indexedThroughBlock ? args.tipBlock - args.indexedThroughBlock : 0n;
  return { lagBlocks: lag, stale: lag > 0n };
}
