import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { randomUUID } from "node:crypto";
import type { Env } from "@pairband/config";
import { financialActionsAllowed } from "@pairband/config";
import {
  createPool,
  type DbPool,
  migrateUp,
  outboxHealth,
  upsertEarlyAccess,
  EARLY_ACCESS_ROLES,
  createAuthNonce,
  consumeAuthNonce,
  createSession,
  lookupSession,
  revokeSession,
  upsertReminderPreference,
  verifyEmailToken,
  getRemindersForAccount,
} from "@pairband/database";
import { getAddress, isAddress, type Hex } from "viem";
import { apiError, redactForLogs } from "./lib/errors.js";
import {
  SESSION_COOKIE,
  CSRF_COOKIE,
  buildSignInMessage,
  verifySignInSignature,
  newCsrfToken,
  type ContractWalletVerifier,
} from "./lib/auth-crypto.js";
import { loadPublicDeployment } from "./lib/deployment.js";
import { educationalPayoffs, buildEducationalPayoffSeries, referenceMarkUnavailable } from "@pairband/domain";
import {
  fixtureLifecycleBatches,
  replayAll,
  indexerLag,
  FIXTURE_ADDR,
  type IndexerState,
} from "@pairband/indexer";
import {
  assertManifestAllowsActions,
  encodeBuyExactOutput,
  encodeSellExactInput,
  encodeVaultMint,
  encodeVaultCancel,
  encodeVaultExercise,
  encodeVaultRedeem,
  encodeVaultFinalize,
  QuoteRequestSchema,
  PrepareRequestSchema,
  TransactionIntentRequestSchema,
  buildFixtureBuyQuote,
  buildFixtureSellQuote,
  generateOpenApiDocument,
  encodeBuyExactOutputCalldata,
  encodeVaultCalldata,
  assertBuyExactOutputSemantics,
  assertVaultActionSemantics,
  assertUnsignedTxShape,
  type DeploymentManifest,
} from "@pairband/sdk";


type IndexerMode = "disabled" | "fixture" | "anvil" | "arc-rpc";

function resolveIndexerMode(): IndexerMode {
  const raw = (process.env.INDEXER_MODE ?? "disabled").toLowerCase();
  if (raw === "fixture" || raw === "anvil" || raw === "arc-rpc" || raw === "disabled") {
    return raw;
  }
  return "disabled";
}

function loadFixtureIndexerState(mode: "fixture" | "anvil"): IndexerState {
  const { batches } = fixtureLifecycleBatches();
  return replayAll(31_337, batches, mode);
}

function serializeAccounting(state: IndexerState) {
  return [...state.accounting.values()].map((row) => ({
    seriesId: row.seriesId,
    writerUnits: row.writerUnits.toString(),
    exercisedUnits: row.exercisedUnits.toString(),
    redeemedUnits: row.redeemedUnits.toString(),
    accountedUsdc6: row.accountedUsdc6.toString(),
    accountedEurc6: row.accountedEurc6.toString(),
    asOfBlock: row.asOfBlock.toString(),
    asOfHash: row.asOfHash,
  }));
}

export type BuildServerOptions = {
  pool?: DbPool | null;
  contractWalletVerifier?: ContractWalletVerifier;
  /** Test-only: capture email verification tokens without sending. */
  exposeVerificationTokens?: boolean;
};

declare module "fastify" {
  interface FastifyRequest {
    requestId: string;
    sessionAddress?: `0x${string}`;
  }
}

export async function buildServer(env: Env, opts: BuildServerOptions = {}) {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
    bodyLimit: 64 * 1024,
    genReqId: () => randomUUID(),
  });

  const pool =
    opts.pool !== undefined
      ? opts.pool
      : env.DATABASE_URL
        ? createPool(env.DATABASE_URL)
        : null;

  if (pool && env.DATABASE_URL) {
    await migrateUp(pool);
  }

  await app.register(cors, {
    origin: [env.PUBLIC_APP_ORIGIN, env.PUBLIC_SITE_ORIGIN],
    credentials: true,
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
    hook: "preHandler",
  });

  app.addHook("onRequest", async (req, reply) => {
    req.requestId = (req.id as string) || randomUUID();
    reply.header("x-request-id", req.requestId);
    reply.header("x-content-type-options", "nosniff");
  });

  app.addHook("onSend", async (req, reply, payload) => {
    if (req.url.startsWith("/v1/me") || req.url.startsWith("/v1/auth")) {
      reply.header("cache-control", "private, no-store");
    }
    return payload;
  });

  app.setErrorHandler((err, req, reply) => {
    req.log.error({ err: redactForLogs(err) }, "request error");
    const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
    const { body } = apiError(
      statusCode >= 500 ? "INTERNAL" : "REQUEST_ERROR",
      statusCode >= 500 ? "Unexpected server error" : err.message,
      req.requestId,
      { statusCode, retryable: statusCode >= 500 },
    );
    reply.code(statusCode).send(body);
  });

  async function requireSession(req: import("fastify").FastifyRequest) {
    if (!pool) throw Object.assign(new Error("Database unavailable"), { statusCode: 503 });
    const token = req.cookies[SESSION_COOKIE];
    if (!token) {
      const e = apiError("UNAUTHORIZED", "Session required", req.requestId, { statusCode: 401 });
      throw Object.assign(new Error(e.body.error.message), { statusCode: 401, body: e.body });
    }
    const session = await lookupSession(pool, token);
    if (!session) {
      throw Object.assign(new Error("Session expired or revoked"), {
        statusCode: 401,
        body: apiError("UNAUTHORIZED", "Session expired or revoked", req.requestId, {
          statusCode: 401,
        }).body,
      });
    }
    req.sessionAddress = session.address;
    return session;
  }

  function assertCsrf(req: import("fastify").FastifyRequest) {
    const header = req.headers["x-csrf-token"];
    const cookieToken = req.cookies[CSRF_COOKIE];
    if (!cookieToken || typeof header !== "string" || header !== cookieToken) {
      throw Object.assign(new Error("CSRF validation failed"), {
        statusCode: 403,
        body: apiError("CSRF", "CSRF validation failed", req.requestId, { statusCode: 403 }).body,
      });
    }
  }

  app.get("/health", async () => ({
    ok: true,
    service: "pairband-api",
    mode: env.PAIRBAND_MODE,
    financialActions: financialActionsAllowed(env.PAIRBAND_MODE, false),
  }));

  app.get("/ready", async (_req, reply) => {
    const deps: Record<string, { ok: boolean; required: boolean; detail?: string }> = {
      database: {
        ok: false,
        required: true,
        detail: pool ? "unknown" : "DATABASE_URL not configured",
      },
      email: {
        ok: env.EMAIL_PROVIDER === "disabled",
        required: false,
        detail:
          env.EMAIL_PROVIDER === "disabled"
            ? "disabled (honest default)"
            : "configured but not required for settlement",
      },
      graph: {
        ok: !env.GRAPH_ENABLED,
        required: false,
        detail: env.GRAPH_ENABLED ? "enabled optional" : "disabled",
      },
      indexer: {
        ok: resolveIndexerMode() === "fixture" || resolveIndexerMode() === "anvil",
        required: false,
        detail:
          resolveIndexerMode() === "disabled"
            ? "INDEXER_MODE=disabled — set fixture|anvil for local labeled reads"
            : resolveIndexerMode() === "arc-rpc"
              ? "arc-rpc opt-in only; not auto-indexed in this process"
              : `local ${resolveIndexerMode()} indexer labeled — not Arc live`,
      },
    };

    if (pool) {
      try {
        await pool.query("SELECT 1");
        deps.database = { ok: true, required: true };
      } catch {
        deps.database = { ok: false, required: true, detail: "query failed" };
      }
    }

    const databaseOk = deps.database?.ok === true;
    const coreOk = databaseOk || env.PAIRBAND_MODE === "preview";
    // Preview can run without DB for static health, but ready marks degraded.
    const ready = Boolean(pool) && databaseOk;
    const status = ready ? 200 : 503;
    return reply.code(status).send({
      ready,
      degraded: !ready,
      mode: env.PAIRBAND_MODE,
      note: coreOk
        ? "Settlement core does not depend on Graph/email"
        : "Database required for private preferences / early access",
      dependencies: deps,
    });
  });

  app.get("/v1/deployment", async () => loadPublicDeployment(env));

  app.get("/v1/indexer/status", async (req) => {
    const mode = resolveIndexerMode();
    if (mode === "disabled") {
      return {
        available: false,
        mode,
        source: null,
        note: "Indexer disabled. Use INDEXER_MODE=fixture|anvil for local labeled reads. Arc live indexing is opt-in only.",
        requestId: req.requestId,
      };
    }
    if (mode === "arc-rpc") {
      return {
        available: false,
        mode,
        source: "arc-rpc",
        note: "Arc RPC indexing is read-only labeled and not auto-run in this API process.",
        requestId: req.requestId,
      };
    }
    const state = loadFixtureIndexerState(mode);
    const tip = state.checkpoint?.lastBlock ?? 0n;
    const lag = indexerLag({ indexedThroughBlock: tip, tipBlock: tip });
    return {
      available: true,
      mode,
      source: state.sourceLabel,
      chainId: state.chainId,
      generation: state.generation,
      indexedThroughBlock: tip.toString(),
      lastBlockHash: state.checkpoint?.lastBlockHash ?? null,
      status: state.checkpoint?.status ?? "ok",
      lag: { lagBlocks: lag.lagBlocks.toString(), stale: lag.stale },
      seriesCount: state.series.size,
      note: "Local fixture/anvil projections only — not Arc live chain data",
      requestId: req.requestId,
    };
  });

  app.get("/v1/series", async (req, reply) => {
    const mode = resolveIndexerMode();
    if (mode !== "fixture" && mode !== "anvil") {
      return reply.code(503).send(
        apiError(
          "INDEXER_UNAVAILABLE",
          "Series listing requires INDEXER_MODE=fixture|anvil (local) or a populated RPC indexer. No fabricated live Arc series.",
          req.requestId,
          { statusCode: 503, retryable: true },
        ).body,
      );
    }
    const state = loadFixtureIndexerState(mode);
    const series = [...state.series.values()].map((s) => {
      const acc = state.accounting.get(s.seriesId.toLowerCase());
      return {
        seriesId: s.seriesId,
        vault: s.vault,
        longToken: s.longToken,
        writerReceipt: s.writerReceipt,
        strikePerUnit6: s.strikePerUnit6.toString(),
        tradingStart: s.tradingStart.toString(),
        exerciseStart: s.exerciseStart.toString(),
        exerciseEnd: s.exerciseEnd.toString(),
        paused: s.paused,
        accounting: acc
          ? {
              writerUnits: acc.writerUnits.toString(),
              exercisedUnits: acc.exercisedUnits.toString(),
              redeemedUnits: acc.redeemedUnits.toString(),
              accountedUsdc6: acc.accountedUsdc6.toString(),
              accountedEurc6: acc.accountedEurc6.toString(),
              asOfBlock: acc.asOfBlock.toString(),
              asOfHash: acc.asOfHash,
            }
          : null,
      };
    });
    return {
      source: state.sourceLabel,
      provenance: {
        chainId: state.chainId,
        blockNumber: state.checkpoint?.lastBlock.toString() ?? "0",
        blockHash: state.checkpoint?.lastBlockHash ?? null,
        observedAt: new Date().toISOString(),
        source: "fixture",
        stale: false,
        indexedThroughBlock: state.checkpoint?.lastBlock.toString() ?? "0",
        label: mode,
      },
      series,
      accounting: serializeAccounting(state),
      note: "Labeled local indexer read model — not live Arc markets",
      requestId: req.requestId,
    };
  });

  app.get("/v1/series/:id", async (req, reply) => {
    const mode = resolveIndexerMode();
    if (mode !== "fixture" && mode !== "anvil") {
      return reply.code(404).send(
        apiError("UNKNOWN_SERIES", "Series not found — indexer not populated", req.requestId, {
          statusCode: 404,
        }).body,
      );
    }
    const id = String((req.params as { id: string }).id).toLowerCase();
    const state = loadFixtureIndexerState(mode);
    const row = state.series.get(id);
    if (!row) {
      return reply.code(404).send(
        apiError("UNKNOWN_SERIES", "Series not in local fixture indexer", req.requestId, {
          statusCode: 404,
        }).body,
      );
    }
    const acc = state.accounting.get(id);
    return {
      source: state.sourceLabel,
      series: {
        seriesId: row.seriesId,
        vault: row.vault,
        longToken: row.longToken,
        writerReceipt: row.writerReceipt,
        strikePerUnit6: row.strikePerUnit6.toString(),
        tradingStart: row.tradingStart.toString(),
        exerciseStart: row.exerciseStart.toString(),
        exerciseEnd: row.exerciseEnd.toString(),
        paused: row.paused,
      },
      accounting: acc
        ? {
            writerUnits: acc.writerUnits.toString(),
            exercisedUnits: acc.exercisedUnits.toString(),
            redeemedUnits: acc.redeemedUnits.toString(),
            accountedUsdc6: acc.accountedUsdc6.toString(),
            accountedEurc6: acc.accountedEurc6.toString(),
            asOfBlock: acc.asOfBlock.toString(),
            asOfHash: acc.asOfHash,
          }
        : null,
      note: "Labeled local indexer read model — not live Arc markets",
      requestId: req.requestId,
    };
  });

  app.get("/v1/openapi.json", async () =>
    generateOpenApiDocument({ serverUrl: env.API_ORIGIN, version: "0.0.0-o13" }),
  );

  /** In-memory intent monitoring — never claims settlement. */
  const intentStore = new Map<
    string,
    {
      intentId: string;
      clientIntentId: string;
      account: string;
      chainId: number;
      action: string;
      seriesId: string;
      transactionHash: string;
      status: "monitoring" | "confirmed" | "reverted" | "mismatch" | "unknown";
    }
  >();

  app.post(
    "/v1/quotes",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const parsed = QuoteRequestSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send(
          apiError("VALIDATION", parsed.error.message, req.requestId, {
            statusCode: 400,
            details: parsed.error.flatten(),
          }).body,
        );
      }
      const body = parsed.data;
      const deployment = loadPublicDeployment(env);
      const mode = resolveIndexerMode();

      if (mode === "fixture" || mode === "anvil") {
        const quote =
          body.side === "sell" ? buildFixtureSellQuote(body) : buildFixtureBuyQuote(body);
        return reply.code(200).send({ ...quote, requestId: req.requestId });
      }

      if (body.side === "sell") {
        if (env.PAIRBAND_MODE === "preview" || !deployment.verified) {
          return reply.code(503).send(
            apiError(
              "UNVERIFIED",
              "Sell quotes require verified deployment simulation or INDEXER_MODE=fixture. No fabricated bids.",
              req.requestId,
              { statusCode: 503, retryable: true },
            ).body,
          );
        }
        return reply.code(501).send(
          apiError("NOT_IMPLEMENTED", "Live sell simulation pending", req.requestId, {
            statusCode: 501,
          }).body,
        );
      }

      if (env.PAIRBAND_MODE === "preview" || !deployment.verified) {
        return reply.code(503).send(
          apiError(
            "UNVERIFIED",
            "Quotes unavailable until verified deployment + quoter, or INDEXER_MODE=fixture for labeled local economics. No fabricated Arc premiums.",
            req.requestId,
            { statusCode: 503, retryable: true },
          ).body,
        );
      }
      return reply.code(501).send(
        apiError(
          "NOT_IMPLEMENTED",
          "Live quote simulation pending verified pool/router addresses",
          req.requestId,
          { statusCode: 501 },
        ).body,
      );
    },
  );

  app.post(
    "/v1/actions/prepare",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const parsed = PrepareRequestSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send(
          apiError("VALIDATION", parsed.error.message, req.requestId, {
            statusCode: 400,
            details: parsed.error.flatten(),
          }).body,
        );
      }
      const body = parsed.data;
      const deployment = loadPublicDeployment(env);
      const router =
        (deployment.contracts.pairbandRouter as `0x${string}` | undefined) ??
        (deployment.contracts.router as `0x${string}` | undefined) ??
        null;
      const manifest: DeploymentManifest = {
        schemaVersion: 2,
        mode: env.PAIRBAND_MODE,
        verified: Boolean(deployment.verified),
        chainId: deployment.chainId ?? null,
        pairbandRouter: router,
      };

      // Fixture quotes cannot prepare real transactions in preview.
      if (env.PAIRBAND_MODE === "preview" || !deployment.verified) {
        return reply.code(503).send(
          apiError(
            "UNVERIFIED",
            "Action prepare blocked in preview / unverified deployment. Fixture quotes are review-only.",
            req.requestId,
            { statusCode: 503, retryable: true },
          ).body,
        );
      }

      try {
        assertManifestAllowsActions(manifest);
      } catch (e) {
        return reply.code(503).send(
          apiError("UNVERIFIED", (e as Error).message, req.requestId, {
            statusCode: 503,
            retryable: true,
          }).body,
        );
      }

      const units = BigInt(body.units ?? body.optionUnits ?? "0");
      const deadline = BigInt(body.deadline ?? "0");

      if (body.action === "buyExactOutput") {
        if (!manifest.pairbandRouter || manifest.chainId == null) {
          return reply.code(503).send(
            apiError("UNVERIFIED", "pairbandRouter/chainId missing", req.requestId, {
              statusCode: 503,
            }).body,
          );
        }
        const maxUSDC6 = BigInt(body.maxUSDC6 ?? "0");
        const encoded = encodeBuyExactOutput({
          seriesId: body.seriesId,
          optionUnits: units,
          maxUSDC6,
          deadline,
        });
        const data = encodeBuyExactOutputCalldata({
          seriesId: body.seriesId,
          optionUnits: units,
          maxUSDC6,
          deadline,
        });
        const semantic = assertBuyExactOutputSemantics(data, {
          seriesId: body.seriesId,
          optionUnits: units,
          maxUSDC6,
          deadline,
        });
        const unsigned = {
          chainId: manifest.chainId,
          from: body.account,
          to: manifest.pairbandRouter,
          data,
          value: "0" as const,
          gasEstimateNative18: null,
          maxFeePerGasNative18: null,
          deadline: deadline.toString(),
        };
        const shape = assertUnsignedTxShape(unsigned, {
          chainId: manifest.chainId,
          from: body.account,
          to: manifest.pairbandRouter,
        });
        if (semantic.length || shape.length) {
          return reply.code(400).send(
            apiError("VALIDATION", "Semantic transaction check failed", req.requestId, {
              statusCode: 400,
              details: [...semantic, ...shape],
            }).body,
          );
        }
        return {
          status: "ready",
          action: body.action,
          chainId: manifest.chainId,
          target: manifest.pairbandRouter,
          signature: encoded.signature,
          args: encoded.args.map((a) => (typeof a === "bigint" ? a.toString() : a)),
          unsignedTransaction: unsigned,
          requiredApprovals: [
            {
              token: "0x3600000000000000000000000000000000000000",
              spender: manifest.pairbandRouter,
              amount: maxUSDC6.toString(),
            },
          ],
          simulation: "unavailable",
          warningCodes: ["SIMULATION_PENDING"],
          note: "Calldata decoded and semantically asserted; RPC simulation still required before wallet submit",
          requestId: req.requestId,
        };
      }

      if (body.action === "sellExactInput") {
        if (!manifest.pairbandRouter || manifest.chainId == null) {
          return reply.code(503).send(
            apiError("UNVERIFIED", "pairbandRouter/chainId missing", req.requestId, {
              statusCode: 503,
            }).body,
          );
        }
        const encoded = encodeSellExactInput({
          seriesId: body.seriesId,
          optionUnits: units,
          minUSDC6: BigInt(body.minUSDC6 ?? "0"),
          deadline,
        });
        return {
          status: "scaffold",
          action: body.action,
          chainId: manifest.chainId,
          target: manifest.pairbandRouter,
          signature: encoded.signature,
          args: encoded.args.map((a) => (typeof a === "bigint" ? a.toString() : a)),
          unsignedTransaction: null,
          requiredApprovals: [],
          simulation: "unavailable",
          warningCodes: ["SIMULATION_PENDING"],
          note: "Sell prepare scaffold — full ABI encode pending verified route",
          requestId: req.requestId,
        };
      }

      const vaultActions = new Set(["mint", "cancel", "exercise", "redeem", "finalize"]);
      if (vaultActions.has(body.action)) {
        const vault =
          (deployment.contracts.seriesVault as `0x${string}` | undefined) ?? body.vault ?? null;
        if (!vault || manifest.chainId == null) {
          return reply.code(503).send(
            apiError("UNVERIFIED", "Vault target / chainId required", req.requestId, {
              statusCode: 503,
            }).body,
          );
        }
        const action = body.action as "mint" | "cancel" | "exercise" | "redeem" | "finalize";
        const encoded =
          action === "mint"
            ? encodeVaultMint(units)
            : action === "cancel"
              ? encodeVaultCancel(units)
              : action === "exercise"
                ? encodeVaultExercise(units)
                : action === "redeem"
                  ? encodeVaultRedeem(units)
                  : encodeVaultFinalize();
        const data = encodeVaultCalldata(action, action === "finalize" ? undefined : units);
        const semantic = assertVaultActionSemantics(
          data,
          action,
          action === "finalize" ? undefined : units,
        );
        if (semantic.length) {
          return reply.code(400).send(
            apiError("VALIDATION", "Semantic vault check failed", req.requestId, {
              statusCode: 400,
              details: semantic,
            }).body,
          );
        }
        const unsigned = {
          chainId: manifest.chainId,
          from: body.account,
          to: vault,
          data,
          value: "0" as const,
          gasEstimateNative18: null,
          maxFeePerGasNative18: null,
          deadline: null,
        };
        return {
          status: "ready",
          action: body.action,
          chainId: manifest.chainId,
          target: vault,
          signature: encoded.signature,
          args: encoded.args.map((a) => (typeof a === "bigint" ? a.toString() : a)),
          preview: {
            fee6: action === "mint" ? undefined : "0",
          },
          unsignedTransaction: unsigned,
          requiredApprovals: [],
          simulation: "unavailable",
          warningCodes: action === "exercise" ? ["NO_REFERENCE_MARK_REQUIRED"] : [],
          note: "Exercise does not require reference marks. RPC simulation pending.",
          requestId: req.requestId,
        };
      }

      return reply.code(400).send(
        apiError(
          "VALIDATION",
          "Unsupported or incomplete LP action in this pass (lp_add|lp_decrease|lp_collect next)",
          req.requestId,
        ).body,
      );
    },
  );

  app.post("/v1/transaction-intents", async (req, reply) => {
    const parsed = TransactionIntentRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send(
        apiError("VALIDATION", parsed.error.message, req.requestId, {
          statusCode: 400,
          details: parsed.error.flatten(),
        }).body,
      );
    }
    const body = parsed.data;
    const key = `${body.account}:${body.clientIntentId}`;
    const existing = intentStore.get(key);
    if (existing) {
      if (existing.transactionHash !== body.transactionHash) {
        return reply.code(400).send(
          apiError(
            "MISMATCH",
            "clientIntentId already registered with a different hash",
            req.requestId,
            { statusCode: 400 },
          ).body,
        );
      }
      return reply.code(202).send({
        status: existing.status,
        intentId: existing.intentId,
        clientIntentId: existing.clientIntentId,
        transactionHash: existing.transactionHash,
        note: "Idempotent monitoring replay — not settlement",
        requestId: req.requestId,
      });
    }
    const intentId = `intent-${intentStore.size + 1}`;
    const row = {
      intentId,
      clientIntentId: body.clientIntentId,
      account: body.account,
      chainId: body.chainId,
      action: body.action,
      seriesId: body.seriesId,
      transactionHash: body.transactionHash,
      status: "monitoring" as const,
    };
    intentStore.set(key, row);
    return reply.code(202).send({
      status: "monitoring",
      intentId,
      clientIntentId: body.clientIntentId,
      transactionHash: body.transactionHash,
      note: "Monitoring only — a submitted hash is not purchased coverage",
      requestId: req.requestId,
    });
  });

  app.get("/v1/wallets/:address/positions", async (req, reply) => {
    const address = String((req.params as { address: string }).address ?? "");
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return reply.code(400).send(
        apiError("VALIDATION", "Valid address required", req.requestId).body,
      );
    }
    const mode = resolveIndexerMode();
    if (mode !== "fixture" && mode !== "anvil") {
      return reply.code(503).send(
        apiError(
          "INDEXER_UNAVAILABLE",
          "Wallet positions require indexer (fixture|anvil|rpc). No invented balances.",
          req.requestId,
          { statusCode: 503, retryable: true },
        ).body,
      );
    }
    const state = loadFixtureIndexerState(mode);
    const isFixtureAccount =
      address.toLowerCase() === FIXTURE_ADDR.ACCOUNT.toLowerCase();
    const series = [...state.series.values()][0];
    const longBal = series
      ? state.balances.get(
          `${series.longToken.toLowerCase()}:${FIXTURE_ADDR.ACCOUNT.toLowerCase()}`,
        ) ?? 0n
      : 0n;
    const longs =
      isFixtureAccount && series && longBal > 0n
        ? [
            {
              kind: "long",
              seriesId: series.seriesId,
              token: series.longToken,
              rawAmount: longBal.toString(),
              costBasis: "unknown",
              vault: series.vault,
              strikePerUnit6: series.strikePerUnit6.toString(),
              exerciseStart: series.exerciseStart.toString(),
              exerciseEnd: series.exerciseEnd.toString(),
            },
          ]
        : [];
    const receipts =
      isFixtureAccount && series
        ? [
            {
              kind: "receipt",
              seriesId: series.seriesId,
              token: series.writerReceipt,
              rawAmount: "0",
              costBasis: "unknown",
              note: "Receipt balance requires mint evidence — zero until confirmed",
            },
          ]
        : [];
    return {
      address: address.toLowerCase(),
      source: state.sourceLabel,
      longs,
      receipts,
      liquidity: [],
      note: "Labeled fixture/anvil projections only. Long/receipt/LP stay separate. Not Arc live wallet inventory.",
      requestId: req.requestId,
    };
  });

  app.get("/v1/reference-marks", async (req, reply) => {
    const mark = referenceMarkUnavailable();
    return reply.code(200).send({
      ...mark,
      note: "Reference marks are informational only and never gate exercise",
      requestId: req.requestId,
    });
  });

  app.post("/v1/analytics/payoff", async (req, reply) => {
    const body = (req.body ?? {}) as {
      exposureEurc?: string;
      strikeUsdcPerEurc?: string;
      premiumUsdc?: string;
      spotUsdcPerEurc?: string;
      additionalCostsUsdc?: string;
      missedExercise?: boolean;
    };
    try {
      const result = educationalPayoffs({
        exposureEurc: BigInt(body.exposureEurc ?? "10000"),
        strikeUsdcPerEurc: body.strikeUsdcPerEurc ?? "1.10",
        premiumUsdc: BigInt(body.premiumUsdc ?? "200"),
        spotUsdcPerEurc: body.spotUsdcPerEurc ?? "1.00",
        additionalCostsUsdc: body.additionalCostsUsdc ? BigInt(body.additionalCostsUsdc) : 0n,
        missedExercise: Boolean(body.missedExercise),
      });
      const series = buildEducationalPayoffSeries({
        exposureEurc: BigInt(body.exposureEurc ?? "10000"),
        strikeUsdcPerEurc: body.strikeUsdcPerEurc ?? "1.10",
        premiumUsdc: BigInt(body.premiumUsdc ?? "200"),
        additionalCostsUsdc: body.additionalCostsUsdc ? BigInt(body.additionalCostsUsdc) : 0n,
        missedExercise: Boolean(body.missedExercise),
      });
      return {
        kind: "illustrative",
        assumptions: {
          exposureEurc: body.exposureEurc ?? "10000",
          strikeUsdcPerEurc: body.strikeUsdcPerEurc ?? "1.10",
          premiumUsdc: body.premiumUsdc ?? "200",
          spotUsdcPerEurc: body.spotUsdcPerEurc ?? "1.00",
          missedExercise: Boolean(body.missedExercise),
        },
        values: {
          unprotectedUsdc: result.unprotectedUsdc.toString(),
          protectedAfterPremiumUsdc: result.protectedAfterPremiumUsdc.toString(),
          longOnlyPnLUsdc: result.longOnlyPnLUsdc.toString(),
          writerPnLUsdc: result.writerPnLUsdc.toString(),
        },
        series,
        note: "Educational payoff only — not an executable quote or settlement authority",
      };
    } catch (e) {
      return reply.code(400).send(
        apiError("INVALID_AMOUNT", (e as Error).message, req.requestId, { statusCode: 400 }).body,
      );
    }
  });

  app.post(
    "/v1/early-access",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
    },
    async (req, reply) => {
      if (!pool) {
        return reply.code(503).send(
          apiError("PROVIDER_UNAVAILABLE", "Database not configured", req.requestId, {
            statusCode: 503,
            retryable: true,
          }).body,
        );
      }
      const body = (req.body ?? {}) as Record<string, unknown>;
      // honeypot
      if (typeof body.website === "string" && body.website.length > 0) {
        return reply.code(202).send({ status: "received" });
      }
      const email = String(body.email ?? "");
      const role = String(body.role ?? "");
      const privacyAcknowledged = body.privacyAcknowledged === true;
      const privacyVersion = String(body.privacyVersion ?? "");
      const productUpdatesOptIn = Boolean(body.productUpdatesOptIn);
      const intendedUse =
        body.intendedUse === undefined || body.intendedUse === null
          ? undefined
          : String(body.intendedUse);
      const exposureBand =
        body.exposureBand === undefined || body.exposureBand === null
          ? undefined
          : String(body.exposureBand);
      const clientRequestId =
        body.clientRequestId === undefined || body.clientRequestId === null
          ? undefined
          : String(body.clientRequestId);

      if (!privacyAcknowledged || !privacyVersion) {
        return reply.code(400).send(
          apiError("VALIDATION", "privacyAcknowledged and privacyVersion required", req.requestId)
            .body,
        );
      }
      if (!EARLY_ACCESS_ROLES.includes(role as (typeof EARLY_ACCESS_ROLES)[number])) {
        return reply
          .code(400)
          .send(apiError("VALIDATION", "Invalid role", req.requestId).body);
      }
      if (intendedUse && intendedUse.length > 500) {
        return reply
          .code(400)
          .send(apiError("VALIDATION", "intendedUse max 500 characters", req.requestId).body);
      }

      try {
        await upsertEarlyAccess(pool, {
          email,
          role: role as (typeof EARLY_ACCESS_ROLES)[number],
          intendedUse,
          exposureBand,
          privacyAcknowledged: true,
          privacyVersion,
          productUpdatesOptIn,
          clientRequestId,
        });
      } catch (e) {
        const msg = (e as Error).message;
        if (msg === "INVALID_EMAIL" || msg === "INTENDED_USE_TOO_LONG" || msg === "INVALID_ROLE") {
          return reply.code(400).send(apiError("VALIDATION", msg, req.requestId).body);
        }
        throw e;
      }
      // Same response for new/duplicate — no address enumeration.
      return reply.code(202).send({ status: "received" });
    },
  );

  app.post(
    "/v1/auth/nonce",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req, reply) => {
      if (!pool) {
        return reply.code(503).send(
          apiError("PROVIDER_UNAVAILABLE", "Database not configured", req.requestId, {
            statusCode: 503,
            retryable: true,
          }).body,
        );
      }
      const body = (req.body ?? {}) as { address?: string; chainId?: number };
      if (!body.address || !isAddress(body.address)) {
        return reply.code(400).send(apiError("VALIDATION", "Valid address required", req.requestId).body);
      }
      const chainId = body.chainId ?? 5042002;
      const domain = new URL(env.PUBLIC_APP_ORIGIN).host;
      const uri = env.PUBLIC_APP_ORIGIN;
      const row = await createAuthNonce(pool, {
        address: body.address,
        domain,
        uri,
        chainId,
      });
      const issuedAt = new Date().toISOString();
      const message = buildSignInMessage({
        domain,
        uri,
        address: body.address,
        chainId,
        nonce: row.nonce,
        issuedAt,
        expirationTime: row.expiresAt.toISOString(),
      });
      return {
        nonce: row.nonce,
        message,
        domain,
        uri,
        chainId,
        expiresAt: row.expiresAt.toISOString(),
        issuedAt,
      };
    },
  );

  app.post(
    "/v1/auth/verify",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req, reply) => {
      if (!pool) {
        return reply.code(503).send(
          apiError("PROVIDER_UNAVAILABLE", "Database not configured", req.requestId, {
            statusCode: 503,
            retryable: true,
          }).body,
        );
      }
      const body = (req.body ?? {}) as {
        address?: string;
        signature?: string;
        nonce?: string;
        message?: string;
        chainId?: number;
      };
      if (!body.address || !isAddress(body.address) || !body.signature || !body.nonce || !body.message) {
        return reply.code(400).send(apiError("VALIDATION", "address, signature, nonce, message required", req.requestId).body);
      }
      const domain = new URL(env.PUBLIC_APP_ORIGIN).host;
      const uri = env.PUBLIC_APP_ORIGIN;
      const chainId = body.chainId ?? 5042002;

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const consumed = await consumeAuthNonce(client, body.nonce, {
          address: body.address,
          domain,
          uri,
          chainId,
        });
        if (!consumed.ok) {
          await client.query("ROLLBACK");
          const status = consumed.code === "NONCE_REPLAY" ? 409 : 400;
          return reply.code(status).send(
            apiError(consumed.code, "Nonce validation failed", req.requestId, { statusCode: status })
              .body,
          );
        }
        const valid = await verifySignInSignature(
          {
            address: body.address,
            message: body.message,
            signature: body.signature as Hex,
          },
          opts.contractWalletVerifier,
        );
        if (!valid) {
          await client.query("ROLLBACK");
          return reply.code(401).send(
            apiError("INVALID_SIGNATURE", "Signature verification failed", req.requestId, {
              statusCode: 401,
            }).body,
          );
        }
        if (!body.message.includes(domain) || !body.message.includes(uri)) {
          await client.query("ROLLBACK");
          return reply.code(400).send(
            apiError("WRONG_DOMAIN", "Message domain/URI mismatch", req.requestId).body,
          );
        }
        const session = await createSession(client, getAddress(body.address));
        await client.query("COMMIT");
        const csrf = newCsrfToken();
        reply.setCookie(SESSION_COOKIE, session.token, {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: env.PAIRBAND_MODE !== "preview",
          expires: session.expiresAt,
        });
        reply.setCookie(CSRF_COOKIE, csrf, {
          path: "/",
          httpOnly: false,
          sameSite: "lax",
          secure: env.PAIRBAND_MODE !== "preview",
          expires: session.expiresAt,
        });
        return {
          address: getAddress(body.address),
          expiresAt: session.expiresAt.toISOString(),
          note: "Session authenticates private preferences only — not token ownership",
        };
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
  );

  app.post("/v1/auth/logout", async (req, reply) => {
    if (!pool) return reply.code(200).send({ ok: true });
    const token = req.cookies[SESSION_COOKIE];
    if (token) await revokeSession(pool, token);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    reply.clearCookie(CSRF_COOKIE, { path: "/" });
    return { ok: true };
  });

  app.get("/v1/me/reminders", async (req, reply) => {
    try {
      await requireSession(req);
    } catch (e) {
      const err = e as { statusCode?: number; body?: unknown };
      return reply.code(err.statusCode ?? 401).send(err.body ?? { error: "unauthorized" });
    }
    const rows = await getRemindersForAccount(pool!, req.sessionAddress!);
    return { reminders: rows };
  });

  app.put("/v1/me/reminders", async (req, reply) => {
    try {
      await requireSession(req);
      assertCsrf(req);
    } catch (e) {
      const err = e as { statusCode?: number; body?: unknown };
      return reply.code(err.statusCode ?? 403).send(err.body ?? { error: "forbidden" });
    }
    const body = (req.body ?? {}) as {
      seriesId?: string;
      enabled?: boolean;
      email?: string;
      scheduleCodes?: string[];
      consentVersion?: string;
    };
    if (!body.seriesId || !body.email || !body.consentVersion) {
      return reply.code(400).send(apiError("VALIDATION", "seriesId, email, consentVersion required", req.requestId).body);
    }
    try {
      const result = await upsertReminderPreference(pool!, {
        account: req.sessionAddress!,
        seriesIdHex: body.seriesId,
        enabled: Boolean(body.enabled),
        email: body.email,
        scheduleCodes: body.scheduleCodes ?? ["exercise_open", "exercise_24h"],
        consentVersion: body.consentVersion,
      });
      return {
        status: result.status,
        emailDelivery: "disabled",
        note: "Email provider disabled until configured; verification pending records created",
        ...(opts.exposeVerificationTokens && result.verificationToken
          ? { testVerificationToken: result.verificationToken }
          : {}),
      };
    } catch (e) {
      return reply.code(400).send(apiError("VALIDATION", (e as Error).message, req.requestId).body);
    }
  });

  app.post("/v1/me/email/verify", async (req, reply) => {
    if (!pool) {
      return reply.code(503).send(
        apiError("PROVIDER_UNAVAILABLE", "Database not configured", req.requestId, {
          statusCode: 503,
        }).body,
      );
    }
    const body = (req.body ?? {}) as { token?: string };
    if (!body.token) {
      return reply.code(400).send(apiError("VALIDATION", "token required", req.requestId).body);
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await verifyEmailToken(client, body.token);
      if (!result.ok) {
        await client.query("ROLLBACK");
        return reply.code(400).send(apiError(result.code, "Verification failed", req.requestId).body);
      }
      await client.query("COMMIT");
      return { status: "verified" };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  });

  app.get("/v1/ops/outbox", async (req, reply) => {
    // Operator-facing scaffold metrics; no PII.
    if (!pool) {
      return reply.code(503).send(
        apiError("PROVIDER_UNAVAILABLE", "Database not configured", req.requestId, {
          statusCode: 503,
        }).body,
      );
    }
    const health = await outboxHealth(pool);
    return { ...health, emailProvider: env.EMAIL_PROVIDER };
  });

  app.addHook("onClose", async () => {
    if (pool && opts.pool === undefined) {
      await pool.end();
    }
  });

  return app;
}
