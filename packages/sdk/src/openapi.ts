/**
 * Generate OpenAPI 3.1 from the same Zod schemas used at runtime.
 * Hand-maintained YAML must not diverge — prefer this artifact.
 */
import {
  QuoteRequestSchema,
  PrepareRequestSchema,
  TransactionIntentRequestSchema,
  QuoteResponseSchema,
  PrepareResponseSchema,
  TransactionIntentResponseSchema,
} from "./schemas.js";

function zodToRoughSchema(schema: { description?: string } | unknown): Record<string, unknown> {
  // Lightweight JSON Schema hints — full zod-to-json-schema avoided to keep deps thin.
  const name = (schema as { constructor?: { name?: string } })?.constructor?.name ?? "object";
  return {
    type: "object",
    description: `Runtime-validated via ${name} (see @pairband/sdk schemas)`,
    additionalProperties: true,
  };
}

export function generateOpenApiDocument(opts?: {
  title?: string;
  version?: string;
  serverUrl?: string;
}): Record<string, unknown> {
  return {
    openapi: "3.1.0",
    info: {
      title: opts?.title ?? "Pairband API",
      version: opts?.version ?? "0.0.0-o13",
      description:
        "Generated from @pairband/sdk Zod schemas. Preview never invents live Arc quotes. Fixture responses are labeled and not executable for wallet submission without a verified deployment.",
    },
    servers: [{ url: opts?.serverUrl ?? "http://localhost:3001" }],
    paths: {
      "/v1/quotes": {
        post: {
          summary: "Exact-output buy / exact-input sell quote",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: zodToRoughSchema(QuoteRequestSchema),
                examples: {
                  buy: {
                    value: {
                      seriesId: `0x${"11".repeat(32)}`,
                      side: "buy",
                      optionUnits: "100000000",
                      account: `0x${"55".repeat(20)}`,
                      slippageBps: 50,
                    },
                  },
                  malformed: {
                    summary: "negative example — missing account",
                    value: {
                      seriesId: `0x${"11".repeat(32)}`,
                      side: "buy",
                      optionUnits: "0",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Quote (may be fixture-labeled and non-executable)",
              content: { "application/json": { schema: zodToRoughSchema(QuoteResponseSchema) } },
            },
            "400": { description: "VALIDATION / INVALID_AMOUNT" },
            "409": { description: "PHASE_NOT_TRADING" },
            "422": { description: "NO_LIQUIDITY" },
            "503": { description: "UNVERIFIED / PROVIDER_UNAVAILABLE" },
          },
        },
      },
      "/v1/actions/prepare": {
        post: {
          summary: "Prepare unsigned action with semantic checks",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: zodToRoughSchema(PrepareRequestSchema),
                examples: {
                  exercise: {
                    value: {
                      action: "exercise",
                      seriesId: `0x${"11".repeat(32)}`,
                      account: `0x${"55".repeat(20)}`,
                      units: "40000000",
                      vault: `0x${"22".repeat(20)}`,
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Prepared call or explicit unavailable",
              content: { "application/json": { schema: zodToRoughSchema(PrepareResponseSchema) } },
            },
            "400": { description: "VALIDATION" },
            "503": { description: "UNVERIFIED" },
          },
        },
      },
      "/v1/transaction-intents": {
        post: {
          summary: "Register tx monitoring (never settlement)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: zodToRoughSchema(TransactionIntentRequestSchema),
              },
            },
          },
          responses: {
            "202": {
              description: "Monitoring accepted",
              content: {
                "application/json": { schema: zodToRoughSchema(TransactionIntentResponseSchema) },
              },
            },
            "400": { description: "VALIDATION / MISMATCH" },
          },
        },
      },
      "/v1/openapi.json": {
        get: {
          summary: "This OpenAPI document",
          responses: { "200": { description: "OpenAPI 3.1 JSON" } },
        },
      },
    },
    components: {
      schemas: {
        QuoteRequest: zodToRoughSchema(QuoteRequestSchema),
        QuoteResponse: zodToRoughSchema(QuoteResponseSchema),
        PrepareRequest: zodToRoughSchema(PrepareRequestSchema),
        PrepareResponse: zodToRoughSchema(PrepareResponseSchema),
        TransactionIntentRequest: zodToRoughSchema(TransactionIntentRequestSchema),
        TransactionIntentResponse: zodToRoughSchema(TransactionIntentResponseSchema),
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              required: ["code", "message", "requestId", "retryable"],
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                requestId: { type: "string" },
                retryable: { type: "boolean" },
                details: {},
              },
            },
          },
        },
      },
    },
  };
}
