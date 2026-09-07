import Fastify from "fastify";
import cors from "@fastify/cors";
import type { Env } from "@pairband/config";
import { financialActionsAllowed } from "@pairband/config";

export async function buildServer(env: Env) {
  const app = Fastify({ logger: { level: env.LOG_LEVEL } });
  await app.register(cors, { origin: env.PUBLIC_APP_ORIGIN });

  app.get("/health", async () => ({
    ok: true,
    service: "pairband-api",
    mode: env.PAIRBAND_MODE,
    financialActions: financialActionsAllowed(env.PAIRBAND_MODE, false),
  }));

  app.get("/ready", async () => ({
    ready: true,
    mode: env.PAIRBAND_MODE,
    note: "Scaffold readiness only — indexer/db not required until later stages",
  }));

  return app;
}
