import { createHash, randomBytes } from "node:crypto";
import cors from "cors";
import express from "express";
import { and, desc, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { ACTIVE_CHAIN } from "@pairband/config";
import {
  checkBand,
  isAddressLike,
  refuseMessage,
  sameAssetPayPreview,
  validateMemo,
} from "@pairband/domain";
import {
  createDb,
  earlyAccess,
  memberships,
  orgs,
  payees,
  quotesLog,
  receipts,
  sessions,
  siweNonces,
  users,
  type Db,
} from "@pairband/database";
import { verifyMessage, type Hex } from "viem";
import { verifyPayTransaction } from "./arc-verify";

const PORT = Number(process.env.PORT ?? 3001);
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://pairband:pairband@127.0.0.1:5432/pairband";
const SESSION_DAYS = 14;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const AUTH_DOMAIN = process.env.PAIRBAND_AUTH_DOMAIN ?? "localhost:3000";
/** Test-only escape hatch; production uses HttpOnly cookie only. */
const ALLOW_HEADER_SESSION = process.env.ALLOW_HEADER_SESSION === "true";

const db: Db = createDb(DATABASE_URL);
const app = express();
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "64kb" }));

const quoteRateLimit = new Map<string, number[]>();

function clientKey(req: express.Request): string {
  return String(req.headers["x-forwarded-for"] ?? req.ip ?? "unknown");
}

function rateLimit(key: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (quoteRateLimit.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    quoteRateLimit.set(key, arr);
    return false;
  }
  arr.push(now);
  quoteRateLimit.set(key, arr);
  return true;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function parseCookie(req: express.Request, name: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function setSessionCookie(res: express.Response, token: string, expiresAt: Date) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "set-cookie",
    `pairband_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}${secure}`,
  );
}

function getSessionToken(req: express.Request): string | null {
  const cookie = parseCookie(req, "pairband_session");
  if (cookie) return cookie;
  if (ALLOW_HEADER_SESSION) {
    return (req.headers["x-session-token"] as string | undefined) ?? null;
  }
  return null;
}

async function orgPayerSpendTotal(orgId: string, payer: string): Promise<bigint> {
  const rows = await db
    .select({ amountIn: receipts.amountIn, status: receipts.status })
    .from(receipts)
    .where(and(eq(receipts.orgId, orgId), eq(receipts.payer, payer)));
  let total = 0n;
  for (const r of rows) {
    if (r.status === "settled" || r.status === "submitted") {
      total += BigInt(r.amountIn);
    }
  }
  return total;
}

async function checkSpendAuthorized(
  membership: { spendLimitUsd: bigint | null },
  orgId: string,
  payer: string,
  amountIn: bigint,
): Promise<
  | { ok: true; spent: string; remaining: string | null }
  | { ok: false; spent: string; limit: string }
> {
  const spent = await orgPayerSpendTotal(orgId, payer);
  if (membership.spendLimitUsd == null) {
    return { ok: true, spent: spent.toString(), remaining: null };
  }
  if (spent + amountIn > membership.spendLimitUsd) {
    return {
      ok: false,
      spent: spent.toString(),
      limit: membership.spendLimitUsd.toString(),
    };
  }
  return {
    ok: true,
    spent: spent.toString(),
    remaining: (membership.spendLimitUsd - spent - amountIn).toString(),
  };
}

async function getSessionUser(req: express.Request) {
  const token = getSessionToken(req);
  if (!token) return null;
  const rows = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "pairband-api", chainId: ACTIVE_CHAIN.chainId });
});

app.get("/v1/config", (_req, res) => {
  res.json({
    chain: {
      key: ACTIVE_CHAIN.key,
      chainId: ACTIVE_CHAIN.chainId,
      name: ACTIVE_CHAIN.name,
      rpcUrl: ACTIVE_CHAIN.rpcUrl,
      explorerUrl: ACTIVE_CHAIN.explorerUrl,
    },
    tokens: ACTIVE_CHAIN.tokens,
    memo: ACTIVE_CHAIN.memo,
    multicall3From: "0x522fAf9A91c41c443c66765030741e4AaCe147D0",
    eurcRoutesEnabled: ACTIVE_CHAIN.eurcRoutesEnabled,
    convertFeeBps: ACTIVE_CHAIN.convertFeeBps,
    defaultBandBps: ACTIVE_CHAIN.defaultBandBps,
    quoteTtlMs: ACTIVE_CHAIN.quoteTtlMs,
    uniswapV3: ACTIVE_CHAIN.uniswapV3,
  });
});

const earlyAccessSchema = z.object({
  email: z.string().email(),
  role: z.enum(["payer", "ops", "market_maker", "other"]),
  intendedUse: z.string().max(500).optional(),
  privacyVersion: z.string().min(1),
  website: z.string().max(0).optional(),
});

app.post("/v1/early-access", async (req, res) => {
  const parsed = earlyAccessSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  if (parsed.data.website) {
    res.status(202).json({ accepted: true });
    return;
  }
  await db.insert(earlyAccess).values({
    email: parsed.data.email.toLowerCase(),
    role: parsed.data.role,
    intendedUse: parsed.data.intendedUse,
    privacyVersion: parsed.data.privacyVersion,
  });
  res.status(202).json({ accepted: true });
});

app.post("/v1/auth/nonce", async (req, res) => {
  if (!rateLimit(`auth:${clientKey(req)}`, 20)) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }
  const address = String(req.body?.address ?? "").toLowerCase();
  if (!isAddressLike(address)) {
    res.status(400).json({ error: "invalid_address" });
    return;
  }
  const nonce = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  await db.insert(siweNonces).values({ nonce, address, expiresAt });
  const message = [
    `${AUTH_DOMAIN} wants you to sign in with your Ethereum account:`,
    address,
    "",
    "Sign in to Pairband workspace.",
    "",
    `URI: https://${AUTH_DOMAIN}`,
    "Version: 1",
    `Chain ID: ${ACTIVE_CHAIN.chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join("\n");
  res.json({ nonce, message, expiresAt: expiresAt.toISOString() });
});

app.post("/v1/auth/verify", async (req, res) => {
  try {
  if (!rateLimit(`auth:${clientKey(req)}`, 20)) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }
  const schema = z.object({
    address: z.string(),
    message: z.string(),
    signature: z.string(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  const address = parsed.data.address.toLowerCase();
  if (!isAddressLike(address)) {
    res.status(400).json({ error: "invalid_address" });
    return;
  }
  if (!parsed.data.message.includes(`${AUTH_DOMAIN} wants you`)) {
    res.status(401).json({ error: "bad_domain" });
    return;
  }
  const nonceMatch = parsed.data.message.match(/Nonce: ([a-f0-9]+)/i);
  if (!nonceMatch) {
    res.status(400).json({ error: "missing_nonce" });
    return;
  }
  const nonce = nonceMatch[1]!;
  const nonceRows = await db
    .select()
    .from(siweNonces)
    .where(and(eq(siweNonces.nonce, nonce), gt(siweNonces.expiresAt, new Date())))
    .limit(1);
  if (!nonceRows[0] || (nonceRows[0].address && nonceRows[0].address !== address)) {
    res.status(401).json({ error: "nonce_expired" });
    return;
  }
  const ok = await verifyMessage({
    address: address as `0x${string}`,
    message: parsed.data.message,
    signature: parsed.data.signature as `0x${string}`,
  });
  if (!ok) {
    res.status(401).json({ error: "bad_signature" });
    return;
  }
  await db.delete(siweNonces).where(eq(siweNonces.nonce, nonce));
  let user = (
    await db.select().from(users).where(eq(users.address, address)).limit(1)
  )[0];
  if (!user) {
    const inserted = await db.insert(users).values({ address }).returning();
    user = inserted[0]!;
  }
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60_000);
  await db.insert(sessions).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt,
  });
  setSessionCookie(res, token, expiresAt);
  res.json({ ok: true, address: user.address, expiresAt: expiresAt.toISOString() });
  } catch (e) {
    console.error("auth/verify failed", e);
    res.status(500).json({ error: "auth_failed" });
  }
});

app.post("/v1/auth/logout", async (req, res) => {
  const token = getSessionToken(req);
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  res.setHeader("set-cookie", "pairband_session=; Path=/; Max-Age=0");
  res.json({ ok: true });
});

app.get("/v1/me", async (req, res) => {
  const sess = await getSessionUser(req);
  if (!sess) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const mems = await db
    .select({ membership: memberships, org: orgs })
    .from(memberships)
    .innerJoin(orgs, eq(memberships.orgId, orgs.id))
    .where(and(eq(memberships.userId, sess.user.id), eq(memberships.active, true)));
  res.json({
    address: sess.user.address,
    orgs: mems.map((m) => ({
      id: m.org.id,
      name: m.org.name,
      role: m.membership.role,
      defaultBandBps: m.org.defaultBandBps,
      spendLimitUsd: m.membership.spendLimitUsd?.toString() ?? null,
    })),
  });
});

app.post("/v1/orgs", async (req, res) => {
  const sess = await getSessionUser(req);
  if (!sess) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const schema = z.object({
    name: z.string().min(1).max(80),
    defaultBandBps: z.number().int().min(0).max(10_000).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  const [org] = await db
    .insert(orgs)
    .values({
      name: parsed.data.name,
      defaultBandBps: parsed.data.defaultBandBps ?? ACTIVE_CHAIN.defaultBandBps,
    })
    .returning();
  await db.insert(memberships).values({
    orgId: org!.id,
    userId: sess.user.id,
    address: sess.user.address,
    role: "admin",
    spendLimitUsd: null,
    active: true,
  });
  res.status(201).json(org);
});

async function requireOrgMember(req: express.Request, orgId: string, roles?: string[]) {
  const sess = await getSessionUser(req);
  if (!sess) return { error: "unauthorized" as const };
  const row = (
    await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.orgId, orgId),
          eq(memberships.userId, sess.user.id),
          eq(memberships.active, true),
        ),
      )
      .limit(1)
  )[0];
  if (!row) return { error: "forbidden" as const };
  if (roles && !roles.includes(row.role)) return { error: "forbidden" as const };
  return { sess, membership: row };
}

app.get("/v1/orgs/:orgId/members", async (req, res) => {
  const auth = await requireOrgMember(req, req.params.orgId!);
  if ("error" in auth) {
    res.status(auth.error === "unauthorized" ? 401 : 403).json({ error: auth.error });
    return;
  }
  const rows = await db.select().from(memberships).where(eq(memberships.orgId, req.params.orgId!));
  res.json({
    items: rows.map((r) => ({
      address: r.address,
      role: r.role,
      spendLimitUsd: r.spendLimitUsd?.toString() ?? null,
      active: r.active,
    })),
  });
});

app.post("/v1/orgs/:orgId/members", async (req, res) => {
  const auth = await requireOrgMember(req, req.params.orgId!, ["admin"]);
  if ("error" in auth) {
    res.status(auth.error === "unauthorized" ? 401 : 403).json({ error: auth.error });
    return;
  }
  const schema = z.object({
    address: z.string(),
    role: z.enum(["admin", "payer", "viewer"]),
    spendLimitUsd: z.string().regex(/^\d+$/).nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success || !isAddressLike(parsed.data.address)) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  const address = parsed.data.address.toLowerCase();
  let user = (await db.select().from(users).where(eq(users.address, address)).limit(1))[0];
  if (!user) {
    user = (await db.insert(users).values({ address }).returning())[0]!;
  }
  await db
    .insert(memberships)
    .values({
      orgId: req.params.orgId!,
      userId: user.id,
      address,
      role: parsed.data.role,
      spendLimitUsd:
        parsed.data.spendLimitUsd != null ? BigInt(parsed.data.spendLimitUsd) : null,
      active: true,
    })
    .onConflictDoUpdate({
      target: [memberships.orgId, memberships.userId],
      set: {
        role: parsed.data.role,
        spendLimitUsd:
          parsed.data.spendLimitUsd != null ? BigInt(parsed.data.spendLimitUsd) : null,
        active: true,
      },
    });
  res.status(201).json({ ok: true });
});

app.post("/v1/orgs/:orgId/pay-authorize", async (req, res) => {
  const auth = await requireOrgMember(req, req.params.orgId!, ["admin", "payer"]);
  if ("error" in auth) {
    res.status(auth.error === "unauthorized" ? 401 : 403).json({ error: auth.error });
    return;
  }
  const schema = z.object({ amountIn: z.string().regex(/^\d+$/) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  const amountIn = BigInt(parsed.data.amountIn);
  const result = await checkSpendAuthorized(
    auth.membership,
    req.params.orgId!,
    auth.sess.user.address,
    amountIn,
  );
  if (!result.ok) {
    res.status(403).json({
      error: "spend_limit_exceeded",
      spent: result.spent,
      limit: result.limit,
    });
    return;
  }
  res.json({
    ok: true,
    spent: result.spent,
    remaining: result.remaining,
  });
});

app.get("/v1/orgs/:orgId/payees", async (req, res) => {
  const auth = await requireOrgMember(req, req.params.orgId!);
  if ("error" in auth) {
    res.status(auth.error === "unauthorized" ? 401 : 403).json({ error: auth.error });
    return;
  }
  const rows = await db.select().from(payees).where(eq(payees.orgId, req.params.orgId!));
  res.json({ items: rows });
});

app.post("/v1/orgs/:orgId/payees", async (req, res) => {
  const auth = await requireOrgMember(req, req.params.orgId!, ["admin", "payer"]);
  if ("error" in auth) {
    res.status(auth.error === "unauthorized" ? 401 : 403).json({ error: auth.error });
    return;
  }
  const schema = z.object({
    address: z.string(),
    label: z.string().min(1).max(80),
    defaultToken: z.enum(["USDC", "EURC"]).default("USDC"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success || !isAddressLike(parsed.data.address)) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  if (parsed.data.defaultToken === "EURC" && !ACTIVE_CHAIN.eurcRoutesEnabled) {
    res.status(400).json({ error: "pair_disabled", message: refuseMessage("pair_disabled") });
    return;
  }
  const [row] = await db
    .insert(payees)
    .values({
      orgId: req.params.orgId!,
      address: parsed.data.address.toLowerCase(),
      label: parsed.data.label,
      defaultToken: parsed.data.defaultToken,
    })
    .returning();
  res.status(201).json(row);
});

const quoteSchema = z.object({
  tokenIn: z.enum(["USDC", "EURC"]),
  tokenOut: z.enum(["USDC", "EURC"]),
  amountOut: z.string().regex(/^\d+$/),
  bandBps: z.number().int().min(0).max(10_000).optional(),
  payee: z.string().optional(),
  reference: z.string().optional(),
});

app.post("/v1/quotes", async (req, res) => {
  if (!rateLimit(clientKey(req))) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }
  const parsed = quoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  const { tokenIn, tokenOut, amountOut: amountOutStr } = parsed.data;
  const amountOut = BigInt(amountOutStr);
  const bandBps = parsed.data.bandBps ?? ACTIVE_CHAIN.defaultBandBps;

  if (parsed.data.reference) {
    const memo = validateMemo(parsed.data.reference);
    if (!memo.ok) {
      res.status(400).json({ error: memo.error });
      return;
    }
  }
  if (parsed.data.payee && !isAddressLike(parsed.data.payee)) {
    res.status(400).json({ error: "Invalid payee address" });
    return;
  }

  if (tokenIn !== tokenOut) {
    const reason = !ACTIVE_CHAIN.eurcRoutesEnabled
      ? ("pair_disabled" as const)
      : !ACTIVE_CHAIN.uniswapV3.quoterV2
        ? ("quotes_unavailable" as const)
        : ("quotes_unavailable" as const);
    await db.insert(quotesLog).values({
      id: `q_${Date.now()}_${randomBytes(4).toString("hex")}`,
      route: `${tokenIn}->${tokenOut}`,
      amountOut: amountOut.toString(),
      executable: false,
      reason,
      bandBps,
    });
    res.status(200).json({
      executable: false,
      reason,
      message: refuseMessage(reason),
    });
    return;
  }

  const preview = sameAssetPayPreview(amountOut);
  const expiresAt = Date.now() + ACTIVE_CHAIN.quoteTtlMs;
  const quoteId = `q_${expiresAt.toString(36)}_${amountOut.toString(36)}`;
  await db.insert(quotesLog).values({
    id: quoteId,
    route: "direct_transfer_memo",
    amountOut: amountOut.toString(),
    amountIn: preview.amountIn.toString(),
    executable: true,
    expiresAt: new Date(expiresAt),
    bandBps: null,
  });
  res.json({
    executable: true,
    quoteId,
    tokenIn,
    tokenOut,
    amountOut: amountOut.toString(),
    amountIn: preview.amountIn.toString(),
    bandBps: null,
    bandApplicable: false,
    feeBps: 0,
    feeAmountIn: "0",
    expiresAt,
    route: "direct_transfer_memo",
    chainId: ACTIVE_CHAIN.chainId,
  });
});

app.post("/v1/band-check", (req, res) => {
  const schema = z.object({
    amountOut: z.string().regex(/^\d+$/),
    amountInInclusiveFees: z.string().regex(/^\d+$/),
    midRay: z.string().regex(/^\d+$/),
    bandBps: z.number().int().min(0).max(10_000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  const result = checkBand({
    amountOut: BigInt(parsed.data.amountOut),
    amountInInclusiveFees: BigInt(parsed.data.amountInInclusiveFees),
    midRay: BigInt(parsed.data.midRay),
    bandBps: parsed.data.bandBps,
  });
  if (!result.ok) {
    res.json({
      ok: false,
      reason: result.reason,
      message: refuseMessage(result.reason),
      maxAmountIn: result.maxAmountIn.toString(),
      midAmountIn: result.midAmountIn.toString(),
    });
    return;
  }
  res.json({
    ok: true,
    maxAmountIn: result.maxAmountIn.toString(),
    midAmountIn: result.midAmountIn.toString(),
  });
});

const receiptSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  payee: z.string().regex(/^0x[a-fA-F0-9]{40}$/i),
  payer: z.string().regex(/^0x[a-fA-F0-9]{40}$/i).optional(),
  orgId: z.string().uuid().optional(),
  quoteId: z.string().optional(),
  tokenOut: z.enum(["USDC", "EURC"]),
  tokenIn: z.enum(["USDC", "EURC"]),
  amountOut: z.string().regex(/^\d+$/),
  amountIn: z.string().regex(/^\d+$/),
  reference: z.string().min(1).max(64),
  memoId: z.string().nullable().optional(),
  /** Client may only submit submitted/failed; settled requires onchain verify. */
  status: z.enum(["submitted", "failed", "incomplete", "settled"]).optional(),
  chainId: z.number().int(),
});

app.post("/v1/receipts", async (req, res) => {
  const sess = await getSessionUser(req);
  if (!sess) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = receiptSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  if (parsed.data.chainId !== ACTIVE_CHAIN.chainId) {
    res.status(400).json({ error: "wrong_chain" });
    return;
  }
  const payer = (parsed.data.payer ?? sess.user.address).toLowerCase();
  if (payer !== sess.user.address) {
    res.status(403).json({ error: "payer_mismatch" });
    return;
  }

  if (parsed.data.orgId) {
    const auth = await requireOrgMember(req, parsed.data.orgId, ["admin", "payer"]);
    if ("error" in auth) {
      res.status(auth.error === "unauthorized" ? 401 : 403).json({ error: auth.error });
      return;
    }
    const spend = await checkSpendAuthorized(
      auth.membership,
      parsed.data.orgId,
      payer,
      BigInt(parsed.data.amountIn),
    );
    if (!spend.ok) {
      res.status(403).json({
        error: "spend_limit_exceeded",
        spent: spend.spent,
        limit: spend.limit,
      });
      return;
    }
  }

  let status: string =
    parsed.data.status === "failed"
      ? "failed"
      : parsed.data.status === "incomplete"
        ? "incomplete"
        : "submitted";
  if (parsed.data.status === "settled" || parsed.data.status === "submitted") {
    const tokenOut = ACTIVE_CHAIN.tokens[parsed.data.tokenOut].address;
    const verified = await verifyPayTransaction(parsed.data.txHash as Hex, {
      payer,
      payee: parsed.data.payee.toLowerCase(),
      amountOut: BigInt(parsed.data.amountOut),
      tokenOut,
      reference: parsed.data.reference,
      memoId: parsed.data.memoId as Hex | undefined,
    });
    if (verified.ok) {
      status = "settled";
    } else if (parsed.data.status === "settled") {
      res.status(409).json({
        error: "not_settled_onchain",
        reason: verified.reason,
      });
      return;
    } else {
      status = verified.reason === "rpc_unavailable" ? "submitted" : "incomplete";
    }
  }

  const memoCheck = validateMemo(parsed.data.reference);
  if (!memoCheck.ok) {
    res.status(400).json({ error: memoCheck.error });
    return;
  }

  const explorerUrl = `${ACTIVE_CHAIN.explorerUrl}/tx/${parsed.data.txHash}`;
  const [row] = await db
    .insert(receipts)
    .values({
      txHash: parsed.data.txHash,
      quoteId: parsed.data.quoteId,
      payee: parsed.data.payee.toLowerCase(),
      payer,
      orgId: parsed.data.orgId,
      memoId: parsed.data.memoId ?? null,
      tokenOut: parsed.data.tokenOut,
      tokenIn: parsed.data.tokenIn,
      amountOut: parsed.data.amountOut,
      amountIn: parsed.data.amountIn,
      reference: parsed.data.reference,
      status,
      chainId: parsed.data.chainId,
      explorerUrl,
    })
    .returning();
  res.status(201).json(row);
});

app.get("/v1/activity", async (req, res) => {
  const sess = await getSessionUser(req);
  const address =
    typeof req.query.address === "string" ? req.query.address.toLowerCase() : null;
  const orgId = typeof req.query.orgId === "string" ? req.query.orgId : null;
  let rows;
  if (orgId) {
    const auth = await requireOrgMember(req, orgId);
    if ("error" in auth) {
      res.status(auth.error === "unauthorized" ? 401 : 403).json({ error: auth.error });
      return;
    }
    rows = await db
      .select()
      .from(receipts)
      .where(eq(receipts.orgId, orgId))
      .orderBy(desc(receipts.createdAt))
      .limit(200);
  } else if (address) {
    if (!sess || sess.user.address !== address) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    rows = await db
      .select()
      .from(receipts)
      .where(eq(receipts.payer, address))
      .orderBy(desc(receipts.createdAt))
      .limit(200);
  } else if (sess) {
    rows = await db
      .select()
      .from(receipts)
      .where(eq(receipts.payer, sess.user.address))
      .orderBy(desc(receipts.createdAt))
      .limit(200);
  } else {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  res.json({
    items: rows.map((r) => ({
      id: r.id,
      txHash: r.txHash,
      payee: r.payee,
      tokenOut: r.tokenOut,
      amountOut: r.amountOut,
      amountIn: r.amountIn,
      tokenIn: r.tokenIn,
      reference: r.reference,
      memoId: r.memoId,
      status: r.status,
      chainId: r.chainId,
      createdAt: r.createdAt.toISOString(),
      explorerUrl: r.explorerUrl,
    })),
  });
});

app.get("/v1/activity.csv", async (req, res) => {
  const orgId = typeof req.query.orgId === "string" ? req.query.orgId : null;
  const sess = await getSessionUser(req);
  let rows;
  if (orgId) {
    const auth = await requireOrgMember(req, orgId, ["admin", "payer", "viewer"]);
    if ("error" in auth) {
      res.status(auth.error === "unauthorized" ? 401 : 403).json({ error: auth.error });
      return;
    }
    rows = await db.select().from(receipts).where(eq(receipts.orgId, orgId)).orderBy(desc(receipts.createdAt));
  } else if (sess) {
    rows = await db
      .select()
      .from(receipts)
      .where(eq(receipts.payer, sess.user.address))
      .orderBy(desc(receipts.createdAt))
      .limit(500);
  } else {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const header =
    "createdAt,txHash,payee,tokenOut,amountOut,tokenIn,amountIn,reference,memoId,status,explorerUrl";
  const lines = rows.map((r) =>
    [
      r.createdAt.toISOString(),
      r.txHash,
      r.payee,
      r.tokenOut,
      r.amountOut,
      r.tokenIn,
      r.amountIn,
      JSON.stringify(r.reference),
      r.memoId ?? "",
      r.status,
      r.explorerUrl,
    ].join(","),
  );
  res.setHeader("content-type", "text/csv; charset=utf-8");
  res.setHeader("content-disposition", 'attachment; filename="pairband-activity.csv"');
  res.send([header, ...lines].join("\n"));
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`pairband-api listening on 0.0.0.0:${PORT} (chain ${ACTIVE_CHAIN.chainId})`);
  });
}

export { app, db };
