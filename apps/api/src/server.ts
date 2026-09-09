import cors from "cors";
import express from "express";
import { z } from "zod";
import { ACTIVE_CHAIN } from "@pairband/config";
import {
  checkBand,
  isAddressLike,
  refuseMessage,
  sameAssetPayPreview,
  validateMemo,
} from "@pairband/domain";

const PORT = Number(process.env.PORT ?? 3001);
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "64kb" }));

type EarlyAccess = {
  email: string;
  role: string;
  intendedUse?: string;
  createdAt: string;
};

type ReceiptRow = {
  id: string;
  txHash: string;
  payee: string;
  tokenOut: "USDC" | "EURC";
  amountOut: string;
  amountIn: string;
  tokenIn: "USDC" | "EURC";
  reference: string;
  memoId: string | null;
  status: "settled" | "failed" | "incomplete";
  chainId: number;
  createdAt: string;
  explorerUrl: string;
};

const earlyAccessStore: EarlyAccess[] = [];
const receiptsStore: ReceiptRow[] = [];
const quoteRateLimit = new Map<string, number[]>();

function clientKey(req: express.Request): string {
  return String(req.headers["x-forwarded-for"] ?? req.ip ?? "unknown");
}

function rateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
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
  website: z.string().max(0).optional(), // honeypot
});

app.post("/v1/early-access", (req, res) => {
  const parsed = earlyAccessSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", details: parsed.error.flatten() });
    return;
  }
  if (parsed.data.website) {
    res.status(202).json({ accepted: true });
    return;
  }
  earlyAccessStore.push({
    email: parsed.data.email.toLowerCase(),
    role: parsed.data.role,
    intendedUse: parsed.data.intendedUse,
    createdAt: new Date().toISOString(),
  });
  res.status(202).json({ accepted: true });
});

const quoteSchema = z.object({
  tokenIn: z.enum(["USDC", "EURC"]),
  tokenOut: z.enum(["USDC", "EURC"]),
  amountOut: z.string().regex(/^\d+$/),
  bandBps: z.number().int().min(0).max(10_000).optional(),
  payee: z.string().optional(),
  reference: z.string().optional(),
});

app.post("/v1/quotes", (req, res) => {
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

  // Cross-asset: refuse loudly when EURC routes disabled or no Quoter bound.
  if (tokenIn !== tokenOut) {
    if (!ACTIVE_CHAIN.eurcRoutesEnabled) {
      res.status(200).json({
        executable: false,
        reason: "pair_disabled" as const,
        message: refuseMessage("pair_disabled"),
      });
      return;
    }
    if (!ACTIVE_CHAIN.uniswapV3.quoterV2) {
      res.status(200).json({
        executable: false,
        reason: "quotes_unavailable" as const,
        message: refuseMessage("quotes_unavailable"),
      });
      return;
    }
    // Quoter path reserved for when addresses are bound — fail closed for now.
    res.status(200).json({
      executable: false,
      reason: "quotes_unavailable" as const,
      message: refuseMessage("quotes_unavailable"),
    });
    return;
  }

  const preview = sameAssetPayPreview(amountOut);
  const expiresAt = Date.now() + ACTIVE_CHAIN.quoteTtlMs;
  const quoteId = `q_${expiresAt.toString(36)}_${amountOut.toString(36)}`;

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

/** Educational band check helper (does not invent a Uniswap fill). */
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
  payee: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tokenOut: z.enum(["USDC", "EURC"]),
  tokenIn: z.enum(["USDC", "EURC"]),
  amountOut: z.string().regex(/^\d+$/),
  amountIn: z.string().regex(/^\d+$/),
  reference: z.string().min(1).max(64),
  memoId: z.string().nullable().optional(),
  status: z.enum(["settled", "failed", "incomplete"]),
  chainId: z.number().int(),
});

app.post("/v1/receipts", (req, res) => {
  const parsed = receiptSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  const row: ReceiptRow = {
    id: `r_${Date.now().toString(36)}`,
    ...parsed.data,
    memoId: parsed.data.memoId ?? null,
    createdAt: new Date().toISOString(),
    explorerUrl: `${ACTIVE_CHAIN.explorerUrl}/tx/${parsed.data.txHash}`,
  };
  receiptsStore.unshift(row);
  res.status(201).json(row);
});

app.get("/v1/activity", (req, res) => {
  const address = typeof req.query.address === "string" ? req.query.address.toLowerCase() : null;
  const rows = address
    ? receiptsStore.filter((r) => r.payee.toLowerCase() === address)
    : receiptsStore;
  res.json({ items: rows });
});

app.get("/v1/activity.csv", (_req, res) => {
  const header = "createdAt,txHash,payee,tokenOut,amountOut,tokenIn,amountIn,reference,memoId,status,explorerUrl";
  const lines = receiptsStore.map((r) =>
    [r.createdAt, r.txHash, r.payee, r.tokenOut, r.amountOut, r.tokenIn, r.amountIn, JSON.stringify(r.reference), r.memoId ?? "", r.status, r.explorerUrl].join(","),
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

export { app };
