/**
 * O13 runtime request/response schemas — single source for API validation and OpenAPI.
 * Amounts are decimal integer strings. Never accepts private keys.
 */
import { z } from "zod";

export const HexSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]*$/, "invalid hex")
  .transform((s) => s.toLowerCase() as `0x${string}`);

export const AddressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "invalid address")
  .transform((s) => s.toLowerCase() as `0x${string}`);

export const Bytes32Schema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/, "invalid bytes32")
  .transform((s) => s.toLowerCase() as `0x${string}`);

export const IntegerStringSchema = z
  .string()
  .regex(/^\d+$/, "must be non-negative integer string");

export const PositiveIntegerStringSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "must be positive integer string");

export const ProvenanceSchema = z.object({
  chainId: z.number().int(),
  blockNumber: IntegerStringSchema,
  blockHash: HexSchema.nullable(),
  observedAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
  source: z.enum(["rpc", "indexer", "graph", "fixture"]),
  stale: z.boolean(),
  indexedThroughBlock: IntegerStringSchema.optional(),
  label: z.string().optional(),
});

export const QuoteSideSchema = z.enum(["buy", "sell"]);

export const QuoteRequestSchema = z.object({
  seriesId: Bytes32Schema,
  side: QuoteSideSchema,
  optionUnits: PositiveIntegerStringSchema,
  account: AddressSchema,
  slippageBps: z.number().int().min(0).max(500).default(50),
});
export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;

export const UnsignedTransactionSchema = z.object({
  chainId: z.number().int(),
  from: AddressSchema,
  to: AddressSchema,
  data: HexSchema,
  value: z.literal("0"),
  gasEstimateNative18: IntegerStringSchema.nullable(),
  maxFeePerGasNative18: IntegerStringSchema.nullable(),
  deadline: IntegerStringSchema.nullable(),
});
export type UnsignedTransaction = z.infer<typeof UnsignedTransactionSchema>;

export const QuoteResponseSchema = z.object({
  quoteId: z.string().min(1),
  seriesId: Bytes32Schema,
  side: QuoteSideSchema,
  optionUnits: PositiveIntegerStringSchema,
  expectedUSDC6: IntegerStringSchema,
  maxUSDC6: IntegerStringSchema.optional(),
  minUSDC6: IntegerStringSchema.optional(),
  poolId: Bytes32Schema.nullable(),
  poolFeeIncluded: z.boolean(),
  protocolIssuanceFee6: IntegerStringSchema,
  expiresAt: z.string().min(1),
  tradingCutoff: IntegerStringSchema.nullable(),
  spender: AddressSchema.nullable(),
  allowanceNeeded: IntegerStringSchema,
  executable: z.boolean(),
  provenance: ProvenanceSchema,
  unsignedTransaction: UnsignedTransactionSchema.nullable(),
  simulation: z.enum(["skipped", "ok", "failed", "unavailable"]),
  warningCodes: z.array(z.string()),
  note: z.string(),
});
export type QuoteResponse = z.infer<typeof QuoteResponseSchema>;

export const PrepareActionSchema = z.enum([
  "mint",
  "cancel",
  "exercise",
  "redeem",
  "buyExactOutput",
  "sellExactInput",
  "finalize",
  "lp_add",
  "lp_decrease",
  "lp_collect",
]);

export const PrepareRequestSchema = z
  .object({
    action: PrepareActionSchema,
    seriesId: Bytes32Schema,
    account: AddressSchema,
    units: PositiveIntegerStringSchema.optional(),
    optionUnits: PositiveIntegerStringSchema.optional(),
    maxUSDC6: PositiveIntegerStringSchema.optional(),
    minUSDC6: IntegerStringSchema.optional(),
    deadline: PositiveIntegerStringSchema.optional(),
    vault: AddressSchema.optional(),
    positionId: PositiveIntegerStringSchema.optional(),
    lpParameters: z.record(z.unknown()).optional(),
  })
  .superRefine((val, ctx) => {
    const vaultish = ["mint", "cancel", "exercise", "redeem", "finalize"];
    const trade = ["buyExactOutput", "sellExactInput"];
    if (vaultish.includes(val.action) || trade.includes(val.action)) {
      if (val.positionId !== undefined || val.lpParameters !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "positionId/lpParameters forbidden for vault/trade actions",
        });
      }
    }
    if (["mint", "cancel", "exercise", "redeem", ...trade].includes(val.action)) {
      if (!val.units && !val.optionUnits) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "units or optionUnits required",
          path: ["units"],
        });
      }
    }
  });
export type PrepareRequest = z.infer<typeof PrepareRequestSchema>;

export const PrepareResponseSchema = z.object({
  status: z.enum(["scaffold", "ready", "unavailable"]),
  action: PrepareActionSchema,
  chainId: z.number().int().nullable(),
  target: AddressSchema.nullable(),
  signature: z.string(),
  args: z.array(z.union([z.string(), z.number()])),
  preview: z
    .object({
      inputAsset: z.string().optional(),
      inputAmount: IntegerStringSchema.optional(),
      outputAsset: z.string().optional(),
      outputAmount: IntegerStringSchema.optional(),
      fee6: IntegerStringSchema.optional(),
    })
    .optional(),
  unsignedTransaction: UnsignedTransactionSchema.nullable(),
  requiredApprovals: z.array(
    z.object({
      token: AddressSchema,
      spender: AddressSchema,
      amount: IntegerStringSchema,
    }),
  ),
  simulation: z.enum(["skipped", "ok", "failed", "unavailable"]),
  warningCodes: z.array(z.string()),
  note: z.string(),
  requestId: z.string().optional(),
});
export type PrepareResponse = z.infer<typeof PrepareResponseSchema>;

export const TransactionIntentRequestSchema = z.object({
  clientIntentId: z.string().min(1).max(128),
  account: AddressSchema,
  chainId: z.number().int(),
  action: z.string().min(1),
  seriesId: Bytes32Schema,
  transactionHash: HexSchema,
});
export type TransactionIntentRequest = z.infer<typeof TransactionIntentRequestSchema>;

export const TransactionIntentResponseSchema = z.object({
  status: z.enum(["monitoring", "confirmed", "reverted", "mismatch", "unknown"]),
  intentId: z.string(),
  clientIntentId: z.string(),
  transactionHash: HexSchema,
  note: z.string(),
});
