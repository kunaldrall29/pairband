import assert from "node:assert/strict";
import { test } from "node:test";
import { TOPIC0 } from "./abi/events.js";
import { createIndexerState } from "./state.js";
import { ingestBatch, replayAll, startNewGeneration } from "./ingest.js";
import { reconcileState, indexerLag } from "./reconcile.js";
import {
  fixtureLifecycleBatches,
  fixtureDuplicateAndConflict,
  FIXTURE_ADDR,
} from "./fixtures/lifecycle.js";

test("topic0 hashes are stable 32-byte hex", () => {
  for (const [name, hash] of Object.entries(TOPIC0)) {
    assert.match(hash, /^0x[0-9a-f]{64}$/, name);
  }
});

test("fixture lifecycle projections match accounting", () => {
  const { batches, seriesId } = fixtureLifecycleBatches();
  const state = replayAll(31_337, batches, "fixture");
  const acc = state.accounting.get(seriesId.toLowerCase())!;
  assert.equal(acc.writerUnits, 100_000_000n);
  assert.equal(acc.exercisedUnits, 40_000_000n);
  assert.equal(acc.redeemedUnits, 60_000_000n);
  assert.equal(acc.accountedUsdc6, 11_000_000_000n - 4_400_000_000n - 3_960_000_000n);
  // 11e9 - 4.4e9 = 6.6e9; redeem 60% = 3.96e9; remaining 2.64e9
  assert.equal(acc.accountedUsdc6, 2_640_000_000n);
  assert.equal(acc.accountedEurc6, 4_000_000_000n - 2_400_000_000n);
  assert.equal(acc.snapshotWriterUnits, 100_000_000n);
  assert.equal(state.trades.length, 1);
  assert.equal(state.trades[0]?.provenance, "router");
  assert.equal(state.trades[0]?.side, "buy");
  const longBal = state.balances.get(
    `${FIXTURE_ADDR.LONG.toLowerCase()}:${FIXTURE_ADDR.ACCOUNT.toLowerCase()}`,
  );
  assert.equal(longBal, 100_000_000n);
  assert.equal(state.checkpoint?.lastBlock, 3n);
  assert.equal(state.sourceLabel, "fixture");
});

test("incremental equals full replay", () => {
  const { batches, seriesId } = fixtureLifecycleBatches();
  const full = replayAll(1, batches, "fixture");
  const inc = createIndexerState(1, "fixture");
  for (const b of batches) ingestBatch(inc, b);
  const a = full.accounting.get(seriesId.toLowerCase())!;
  const b = inc.accounting.get(seriesId.toLowerCase())!;
  assert.equal(a.writerUnits, b.writerUnits);
  assert.equal(a.exercisedUnits, b.exercisedUnits);
  assert.equal(a.redeemedUnits, b.redeemedUnits);
  assert.equal(a.accountedUsdc6, b.accountedUsdc6);
  assert.equal(a.accountedEurc6, b.accountedEurc6);
  assert.equal(full.eventKeys.size, inc.eventKeys.size);
});

test("duplicates ignored; conflicting hash needs reconciliation", () => {
  const { first, duplicate, conflict } = fixtureDuplicateAndConflict();
  const state = createIndexerState(1, "anvil");
  const a = ingestBatch(state, first);
  assert.equal(a.applied, 3);
  const d = ingestBatch(state, duplicate);
  assert.equal(d.duplicates, 3);
  assert.equal(d.applied, 0);
  const c = ingestBatch(state, conflict);
  assert.equal(c.status, "needs_reconciliation");
  const gen = startNewGeneration(state);
  assert.equal(gen.generation, 2);
  assert.equal(gen.checkpoint?.status, "reset");
});

test("reconcile detects donation without minting claims", () => {
  const { batches, seriesId } = fixtureLifecycleBatches();
  const state = replayAll(1, batches, "fixture");
  const acc = state.accounting.get(seriesId.toLowerCase())!;
  const report = reconcileState(state, [
    {
      seriesId: seriesId as `0x${string}`,
      writerUnits: acc.writerUnits,
      exercisedUnits: acc.exercisedUnits,
      redeemedUnits: acc.redeemedUnits,
      accountedUsdc6: acc.accountedUsdc6,
      accountedEurc6: acc.accountedEurc6,
      longSupply: acc.writerUnits - acc.exercisedUnits,
      receiptSupply: acc.writerUnits - acc.redeemedUnits,
      vaultUsdcBalance6: acc.accountedUsdc6 + 999n,
      vaultEurcBalance6: acc.accountedEurc6,
      asOfBlock: acc.asOfBlock,
      asOfHash: acc.asOfHash,
    },
  ]);
  assert.equal(report.ok, true);
  assert.ok(report.issues.some((i) => i.severity === "donation_detected"));
});

test("indexer lag marks stale without fabricating tip data", () => {
  const lag = indexerLag({ indexedThroughBlock: 10n, tipBlock: 15n });
  assert.equal(lag.lagBlocks, 5n);
  assert.equal(lag.stale, true);
});
