import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { privateKeyToAccount } from "viem/accounts";
import { ACTIVE_CHAIN } from "@pairband/config";
import { checkBand, refuseMessage } from "@pairband/domain";

const BASE = process.env.PAIRBAND_API_URL ?? "http://127.0.0.1:3001";

async function json(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

function sessionCookie(res: Response): string {
  const rawCookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie") ?? ""];
  for (const raw of rawCookies) {
    const match = raw.match(/pairband_session=([^;]+)/);
    if (match) return `pairband_session=${decodeURIComponent(match[1])}`;
  }
  throw new Error("no_session_cookie");
}

async function siweSession(account: ReturnType<typeof privateKeyToAccount>) {
  const nonceRes = await json("/v1/auth/nonce", {
    method: "POST",
    body: JSON.stringify({ address: account.address }),
  });
  const signature = await account.signMessage({ message: nonceRes.body.message });
  const verify = await json("/v1/auth/verify", {
    method: "POST",
    body: JSON.stringify({
      address: account.address,
      message: nonceRes.body.message,
      signature,
    }),
  });
  assert.equal(verify.res.status, 200);
  assert.equal(verify.body.token, undefined);
  return sessionCookie(verify.res);
}

describe("security & functional API", () => {
  it("health and config expose testnet honesty flags", async () => {
    const health = await json("/health");
    assert.equal(health.res.status, 200);
    assert.equal(health.body.chainId, ACTIVE_CHAIN.chainId);
    const cfg = await json("/v1/config");
    assert.equal(cfg.body.eurcRoutesEnabled, false);
    assert.equal(cfg.body.memo, ACTIVE_CHAIN.memo);
  });

  it("refuses EURC quotes loudly (no fake 0)", async () => {
    const { res, body } = await json("/v1/quotes", {
      method: "POST",
      body: JSON.stringify({
        tokenIn: "USDC",
        tokenOut: "EURC",
        amountOut: "1000000",
      }),
    });
    assert.equal(res.status, 200);
    assert.equal(body.executable, false);
    assert.equal(body.message, refuseMessage("pair_disabled"));
  });

  it("same-asset quote is executable with TTL", async () => {
    const { body } = await json("/v1/quotes", {
      method: "POST",
      body: JSON.stringify({
        tokenIn: "USDC",
        tokenOut: "USDC",
        amountOut: "1000000",
        reference: "INV-1042",
      }),
    });
    assert.equal(body.executable, true);
    assert.equal(body.amountIn, "1000000");
    assert.ok(body.expiresAt > Date.now());
  });

  it("rejects unauthenticated receipt forgery", async () => {
    const { res, body } = await json("/v1/receipts", {
      method: "POST",
      body: JSON.stringify({
        txHash: "0x" + "ab".repeat(32),
        payee: "0x1111111111111111111111111111111111111111",
        tokenOut: "USDC",
        tokenIn: "USDC",
        amountOut: "1",
        amountIn: "1",
        reference: "FAKE",
        status: "settled",
        chainId: ACTIVE_CHAIN.chainId,
      }),
    });
    assert.equal(res.status, 401);
    assert.equal(body.error, "unauthorized");
  });

  it("rejects unauthenticated activity dump", async () => {
    const { res } = await json("/v1/activity");
    assert.equal(res.status, 401);
  });

  it("band-check refuses over-band fills", async () => {
    const { body } = await json("/v1/band-check", {
      method: "POST",
      body: JSON.stringify({
        amountOut: (10_000n * 10n ** 6n).toString(),
        amountInInclusiveFees: (10_900n * 10n ** 6n).toString(),
        midRay: (108n * 10n ** 16n).toString(),
        bandBps: 15,
      }),
    });
    assert.equal(body.ok, false);
    const local = checkBand({
      amountOut: 10_000n * 10n ** 6n,
      amountInInclusiveFees: 10_900n * 10n ** 6n,
      midRay: 108n * 10n ** 16n,
      bandBps: 15,
    });
    assert.equal(local.ok, false);
  });

  it("SIWE nonce binds configured domain (not Host header)", async () => {
    const { body } = await json("/v1/auth/nonce", {
      method: "POST",
      body: JSON.stringify({ address: "0x1111111111111111111111111111111111111111" }),
    });
    assert.match(body.message, /localhost:3000 wants you/);
    assert.ok(!String(body.message).includes("evil.example"));
  });

  it("workspace: SIWE cookie session → create org → invite member → payee", async () => {
    const account = privateKeyToAccount(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    );
    const cookie = await siweSession(account);

    const org = await json("/v1/orgs", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ name: `Audit Org ${Date.now()}` }),
    });
    assert.equal(org.res.status, 201);
    const orgId = org.body.id as string;

    const invitee = "0x2222222222222222222222222222222222222222";
    const member = await json(`/v1/orgs/${orgId}/members`, {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({
        address: invitee,
        role: "payer",
        spendLimitUsd: "1000000000",
      }),
    });
    assert.equal(member.res.status, 201);

    const payee = await json(`/v1/orgs/${orgId}/payees`, {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({
        address: "0x3333333333333333333333333333333333333333",
        label: "Contractor",
        defaultToken: "USDC",
      }),
    });
    assert.equal(payee.res.status, 201);

    const members = await json(`/v1/orgs/${orgId}/members`, { headers: { cookie } });
    assert.ok(members.body.items.some((m: { address: string }) => m.address === invitee));
  });

  it("pay-authorize enforces cumulative spend limit before wallet", async () => {
    const account = privateKeyToAccount(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    );
    const cookie = await siweSession(account);
    const org = await json("/v1/orgs", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ name: `Limit Org ${Date.now()}`, defaultBandBps: 15 }),
    });
    const orgId = org.body.id as string;
    await json(`/v1/orgs/${orgId}/members`, {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({
        address: account.address,
        role: "payer",
        spendLimitUsd: "2000000",
      }),
    });

    const ok = await json(`/v1/orgs/${orgId}/pay-authorize`, {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ amountIn: "1500000" }),
    });
    assert.equal(ok.res.status, 200);
    assert.equal(ok.body.ok, true);

    const over = await json(`/v1/orgs/${orgId}/pay-authorize`, {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ amountIn: "3000000" }),
    });
    assert.equal(over.res.status, 403);
    assert.equal(over.body.error, "spend_limit_exceeded");
  });

  it("settled receipt without real Memo tx is rejected", async () => {
    const account = privateKeyToAccount(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    );
    const cookie = await siweSession(account);
    const { res, body } = await json("/v1/receipts", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({
        txHash: "0x" + "11".repeat(32),
        payee: "0x1111111111111111111111111111111111111111",
        payer: account.address,
        tokenOut: "USDC",
        tokenIn: "USDC",
        amountOut: "1000000",
        amountIn: "1000000",
        reference: "INV-AUDIT",
        status: "settled",
        chainId: ACTIVE_CHAIN.chainId,
      }),
    });
    assert.equal(res.status, 409);
    assert.equal(body.error, "not_settled_onchain");
  });
});
