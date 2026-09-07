import assert from "node:assert/strict";
import { test } from "node:test";
import { loadEnv } from "@pairband/config";
import { buildServer } from "./server.js";

test("GET /health returns preview mode", async () => {
  const env = loadEnv({ PAIRBAND_MODE: "preview" });
  const app = await buildServer(env);
  const res = await app.inject({ method: "GET", url: "/health" });
  assert.equal(res.statusCode, 200);
  const body = res.json() as { ok: boolean; mode: string; financialActions: boolean };
  assert.equal(body.ok, true);
  assert.equal(body.mode, "preview");
  assert.equal(body.financialActions, false);
  await app.close();
});
