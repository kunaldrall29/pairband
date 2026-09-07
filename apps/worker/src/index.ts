import { loadEnv } from "@pairband/config";
import {
  createPool,
  migrateUp,
  claimOutboxJobs,
  completeOutboxJob,
  failOutboxJob,
  outboxHealth,
} from "@pairband/database";

const env = loadEnv();

/**
 * O15 scaffolding: durable Postgres outbox leases.
 * Email provider remains disabled by default. No wallet keys. No broadcast.
 * Exercise/redeem never depend on this worker.
 */
async function main() {
  const base = {
    service: "pairband-worker",
    mode: env.PAIRBAND_MODE,
    emailProvider: env.EMAIL_PROVIDER,
  };

  if (!env.DATABASE_URL) {
    console.log(
      JSON.stringify({
        ...base,
        status: "idle-no-database",
        note: "Set DATABASE_URL to run outbox leasing. Core product has no worker dependency.",
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
        // Local capture: mark delivered without external send; never claim user email was mailed.
        await completeOutboxJob(pool, job.jobId);
        console.log(
          JSON.stringify({
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
      JSON.stringify({
        ...base,
        status: "tick-complete",
        outbox: health,
        claimed: claimed.length,
        note: "Reminders require O12 series data + verified consent; no messages sent without provider",
      }),
    );
  } finally {
    await pool.end();
  }

  if (process.env.WORKER_STAY_ALIVE === "1") {
    setInterval(() => {
      /* heartbeat */
    }, 60_000);
  }
}

await main();
