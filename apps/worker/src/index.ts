import { loadEnv } from "@pairband/config";

const env = loadEnv();

console.log(
  JSON.stringify({
    service: "pairband-worker",
    mode: env.PAIRBAND_MODE,
    status: "idle-scaffold",
    note: "Indexer, reconciliation, and reminders arrive in O12/O15",
  }),
);

// Keep process alive briefly in dev so parallel scripts do not exit immediately.
if (process.env.WORKER_STAY_ALIVE === "1") {
  setInterval(() => {
    /* scaffold heartbeat */
  }, 60_000);
}
