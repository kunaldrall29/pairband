import { loadEnv } from "@pairband/config";
import {
  createPool,
  migrateUp,
  claimOutboxJobs,
  completeOutboxJob,
  failOutboxJob,
  outboxHealth,
} from "@pairband/database";
import {
  createIndexerState,
  ingestBatch,
  replayAll,
  fixtureLifecycleBatches,
  indexerLag,
} from "@pairband/indexer";

const env = loadEnv();

function jsonSafe(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
}

/**
 * O12 worker tick: outbox + optional fixture/anvil indexer replay.
 * INDEXER_MODE=fixture|anvil|disabled (default disabled for idle).
 * Arc live RPC indexing is opt-in (INDEXER_MODE=arc-rpc) and read-only labeled — not enabled by default.
 * No wallet keys. No broadcast. Exercise does not depend on this worker.
 */
async function main() {
  const indexerMode = (process.env.INDEXER_MODE ?? "disabled") as
    | "disabled"
    | "fixture"
    | "anvil"
    | "arc-rpc";

  const base = {
    service: "pairband-worker",
    mode: env.PAIRBAND_MODE,
    emailProvider: env.EMAIL_PROVIDER,
    indexerMode,
  };

  if (indexerMode === "arc-rpc") {
    console.log(
      jsonSafe({
        ...base,
        status: "arc-rpc-not-auto-run",
        note: "Arc live indexing requires explicit operator config and must be labeled read-only. Default remains fixture/anvil.",
      }),
    );
  }

  let indexerSummary: unknown = null;
  if (indexerMode === "fixture" || indexerMode === "anvil") {
    const { batches, seriesId } = fixtureLifecycleBatches();
    const label = indexerMode === "anvil" ? "anvil" : "fixture";
    const state = replayAll(31_337, batches, label);
    const lag = indexerLag({
      indexedThroughBlock: state.checkpoint?.lastBlock ?? 0n,
      tipBlock: state.checkpoint?.lastBlock ?? 0n,
    });
    indexerSummary = {
      sourceLabel: state.sourceLabel,
      seriesId,
      checkpoint: state.checkpoint,
      lag,
      accounting: state.accounting.get(seriesId.toLowerCase()),
      trades: state.trades.length,
      note: "Local fixture/anvil replay only — not Arc live data",
    };
  }

  if (!env.DATABASE_URL) {
    console.log(
      jsonSafe({
        ...base,
        status: "idle-no-database",
        indexer: indexerSummary,
        note: "Set DATABASE_URL for outbox; INDEXER_MODE=fixture for local replay.",
      }),
    );
    return;
  }

  const pool = createPool(env.DATABASE_URL);
  try {
    await migrateUp(pool);
    const health = await outboxHealth(pool);
    const claimed = await claimOutboxJobs(pool, { limit: 5, leaseSeconds: 30 });

    for (const job of claimed) {
      if (env.EMAIL_PROVIDER === "disabled") {
        await completeOutboxJob(pool, job.jobId);
        console.log(
          jsonSafe({
            ...base,
            event: "local_capture",
            jobId: job.jobId,
            kind: job.kind,
            note: "Provider disabled — captured only, not sent",
          }),
        );
      } else {
        await failOutboxJob(pool, job.jobId, "Provider adapter not implemented in this scaffold", {
          deadLetter: true,
        });
      }
    }

    console.log(
      jsonSafe({
        ...base,
        status: "tick-complete",
        outbox: health,
        claimed: claimed.length,
        indexer: indexerSummary,
      }),
    );
  } finally {
    await pool.end();
  }

  // silence unused in disabled path
  void createIndexerState;
  void ingestBatch;

  if (process.env.WORKER_STAY_ALIVE === "1") {
    setInterval(() => {
      /* heartbeat */
    }, 60_000);
  }
}

await main();
