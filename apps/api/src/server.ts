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
        ok: false,
        required: false,
        detail: "Indexer arrives in O12 — not required for API foundation",
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

  app.get("/v1/series", async (req, reply) => {
    // Explicit unavailable until indexer (O12) — do not invent live series.
    return reply.code(503).send(
      apiError(
        "INDEXER_UNAVAILABLE",
        "Series listing requires the canonical indexer (O12). No fixture live series are returned outside named preview fixtures.",
        req.requestId,
        { statusCode: 503, retryable: true },
      ).body,
    );
  });

  app.get("/v1/series/:id", async (req, reply) => {
    return reply.code(404).send(
      apiError("UNKNOWN_SERIES", "Series not found — indexer not populated", req.requestId, {
        statusCode: 404,
      }).body,
    );
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
