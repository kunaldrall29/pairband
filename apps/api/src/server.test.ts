import assert from "node:assert/strict";
import { test } from "node:test";
import { loadEnv } from "@pairband/config";
import { createPool, migrateUp } from "@pairband/database";
import { privateKeyToAccount } from "viem/accounts";
import { buildServer } from "./server.js";
import { CSRF_COOKIE, SESSION_COOKIE } from "./lib/auth-crypto.js";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://pairband:pairband@127.0.0.1:5432/pairband";

test("GET /health returns preview mode", async () => {
  const env = loadEnv({ PAIRBAND_MODE: "preview" });
  const app = await buildServer(env, { pool: null });
  const res = await app.inject({ method: "GET", url: "/health" });
  assert.equal(res.statusCode, 200);
  const body = res.json() as { ok: boolean; mode: string; financialActions: boolean };
  assert.equal(body.ok, true);
  assert.equal(body.mode, "preview");
  assert.equal(body.financialActions, false);
  await app.close();
});

test("early access dedupe returns identical 202", async () => {
  const pool = createPool(databaseUrl);
  await migrateUp(pool);
  await pool.query(`DELETE FROM early_access_requests WHERE normalized_email = $1`, [
    "o11-test@example.com",
  ]);
  const env = loadEnv({
    PAIRBAND_MODE: "preview",
    DATABASE_URL: databaseUrl,
    PUBLIC_APP_ORIGIN: "http://localhost:3000",
  });
  const app = await buildServer(env, { pool });
  const payload = {
    email: "O11-Test@Example.com",
    role: "researcher",
    privacyAcknowledged: true,
    privacyVersion: "2026-09-07",
    productUpdatesOptIn: false,
    clientRequestId: "c1",
  };
  const a = await app.inject({ method: "POST", url: "/v1/early-access", payload });
  const b = await app.inject({ method: "POST", url: "/v1/early-access", payload });
  assert.equal(a.statusCode, 202);
  assert.equal(b.statusCode, 202);
  assert.deepEqual(a.json(), { status: "received" });
  assert.deepEqual(b.json(), { status: "received" });
  const count = await pool.query(
    `SELECT count(*)::int AS c FROM early_access_requests WHERE normalized_email = $1`,
    ["o11-test@example.com"],
  );
  assert.equal(count.rows[0].c, 1);
  await app.close();
  await pool.end();
});

test("auth nonce replay and CSRF on reminders", async () => {
  const pool = createPool(databaseUrl);
  await migrateUp(pool);
  const env = loadEnv({
    PAIRBAND_MODE: "preview",
    DATABASE_URL: databaseUrl,
    PUBLIC_APP_ORIGIN: "http://localhost:3000",
    SESSION_SECRET: "test-session-secret-not-for-prod",
  });
  const account = privateKeyToAccount(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  );
  const app = await buildServer(env, {
    pool,
    exposeVerificationTokens: true,
  });

  const nonceRes = await app.inject({
    method: "POST",
    url: "/v1/auth/nonce",
    payload: { address: account.address, chainId: 5042002 },
  });
  assert.equal(nonceRes.statusCode, 200);
  const nonceBody = nonceRes.json() as { nonce: string; message: string };
  const signature = await account.signMessage({ message: nonceBody.message });

  const verifyRes = await app.inject({
    method: "POST",
    url: "/v1/auth/verify",
    payload: {
      address: account.address,
      signature,
      nonce: nonceBody.nonce,
      message: nonceBody.message,
      chainId: 5042002,
    },
  });
  assert.equal(verifyRes.statusCode, 200);
  const cookies = verifyRes.cookies;
  const session = cookies.find((c) => c.name === SESSION_COOKIE);
  const csrf = cookies.find((c) => c.name === CSRF_COOKIE);
  assert.ok(session?.value);
  assert.ok(csrf?.value);

  const replay = await app.inject({
    method: "POST",
    url: "/v1/auth/verify",
    payload: {
      address: account.address,
      signature,
      nonce: nonceBody.nonce,
      message: nonceBody.message,
      chainId: 5042002,
    },
  });
  assert.equal(replay.statusCode, 409);

  const seriesId = `0x${"11".repeat(32)}`;
  const noCsrf = await app.inject({
    method: "PUT",
    url: "/v1/me/reminders",
    cookies: { [SESSION_COOKIE]: session!.value },
    payload: {
      seriesId,
      enabled: true,
      email: "holder@example.com",
      consentVersion: "v1",
    },
  });
  assert.equal(noCsrf.statusCode, 403);

  const withCsrf = await app.inject({
    method: "PUT",
    url: "/v1/me/reminders",
    cookies: { [SESSION_COOKIE]: session!.value, [CSRF_COOKIE]: csrf!.value },
    headers: { "x-csrf-token": csrf!.value },
    payload: {
      seriesId,
      enabled: true,
      email: "holder@example.com",
      consentVersion: "v1",
    },
  });
  assert.equal(withCsrf.statusCode, 200);
  const rem = withCsrf.json() as { status: string; emailDelivery: string };
  assert.equal(rem.emailDelivery, "disabled");
  assert.ok(rem.status === "pending_verification" || rem.status === "saved");

  const seriesStub = await app.inject({ method: "GET", url: "/v1/series" });
  assert.equal(seriesStub.statusCode, 503);

  const marks = await app.inject({ method: "GET", url: "/v1/reference-marks" });
  assert.equal(marks.statusCode, 200);
  assert.equal((marks.json() as { status: string }).status, "unavailable");

  const payoff = await app.inject({
    method: "POST",
    url: "/v1/analytics/payoff",
    payload: {
      exposureEurc: "10000",
      strikeUsdcPerEurc: "1.10",
      premiumUsdc: "200",
      spotUsdcPerEurc: "1.00",
    },
  });
  assert.equal(payoff.statusCode, 200);
  const pv = payoff.json() as { values: { protectedAfterPremiumUsdc: string }; kind: string };
  assert.equal(pv.kind, "illustrative");
  assert.equal(pv.values.protectedAfterPremiumUsdc, "10800");

  await app.close();
  await pool.end();
});

test("contract-wallet verifier path accepted when injected", async () => {
  const pool = createPool(databaseUrl);
  await migrateUp(pool);
  const env = loadEnv({
    PAIRBAND_MODE: "preview",
    DATABASE_URL: databaseUrl,
    PUBLIC_APP_ORIGIN: "http://localhost:3000",
  });
  const contract = "0x2222222222222222222222222222222222222222";
  const app = await buildServer(env, {
    pool,
    contractWalletVerifier: async ({ address }) =>
      address.toLowerCase() === contract.toLowerCase(),
  });
  const nonceRes = await app.inject({
    method: "POST",
    url: "/v1/auth/nonce",
    payload: { address: contract, chainId: 5042002 },
  });
  const nonceBody = nonceRes.json() as { nonce: string; message: string };
  const verifyRes = await app.inject({
    method: "POST",
    url: "/v1/auth/verify",
    payload: {
      address: contract,
      signature: `0x${"ab".repeat(65)}`,
      nonce: nonceBody.nonce,
      message: nonceBody.message,
      chainId: 5042002,
    },
  });
  assert.equal(verifyRes.statusCode, 200);
  await app.close();
  await pool.end();
});
