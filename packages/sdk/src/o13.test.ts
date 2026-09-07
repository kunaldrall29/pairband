import assert from "node:assert/strict";
import { test } from "node:test";
import {
  QuoteRequestSchema,
  PrepareRequestSchema,
  TransactionIntentRequestSchema,
  buildFixtureBuyQuote,
  encodeBuyExactOutputCalldata,
  encodeVaultCalldata,
  assertBuyExactOutputSemantics,
  assertVaultActionSemantics,
  assertUnsignedTxShape,
  maxUsdcWithSlippage,
  generateOpenApiDocument,
} from "./index.js";

test("QuoteRequestSchema rejects malformed amounts and addresses", () => {
  assert.throws(() =>
    QuoteRequestSchema.parse({
      seriesId: "0x11",
      side: "buy",
      optionUnits: "0",
      account: "0x55",
    }),
  );
  const ok = QuoteRequestSchema.parse({
    seriesId: `0x${"11".repeat(32)}`,
    side: "buy",
    optionUnits: "100000000",
    account: `0x${"55".repeat(20)}`,
    slippageBps: 50,
  });
  assert.equal(ok.side, "buy");
});

test("PrepareRequestSchema forbids lp fields on vault actions", () => {
  assert.throws(() =>
    PrepareRequestSchema.parse({
      action: "exercise",
      seriesId: `0x${"11".repeat(32)}`,
      account: `0x${"55".repeat(20)}`,
      units: "1",
      positionId: "1",
    }),
  );
});

test("fixture buy quote is labeled non-executable", () => {
  const q = buildFixtureBuyQuote({
    seriesId: `0x${"11".repeat(32)}`,
    side: "buy",
    optionUnits: "100000000",
    account: `0x${"55".repeat(20)}`,
    slippageBps: 50,
  });
  assert.equal(q.executable, false);
  assert.equal(q.provenance.source, "fixture");
  assert.equal(q.unsignedTransaction, null);
  assert.equal(q.expectedUSDC6, "2000000"); // 100 * 0.02 USDC = 2 USDC
  assert.equal(q.maxUSDC6, maxUsdcWithSlippage(2_000_000n, 50).toString());
  assert.ok(q.warningCodes.includes("FIXTURE_NOT_EXECUTABLE"));
});

test("semantic buy calldata round-trip", () => {
  const seriesId = (`0x${"11".repeat(32)}`) as `0x${string}`;
  const data = encodeBuyExactOutputCalldata({
    seriesId,
    optionUnits: 100_000_000n,
    maxUSDC6: 2_010_000n,
    deadline: 1_700_000_000n,
  });
  const issues = assertBuyExactOutputSemantics(data, {
    seriesId,
    optionUnits: 100_000_000n,
    maxUSDC6: 2_010_000n,
    deadline: 1_700_000_000n,
  });
  assert.deepEqual(issues, []);
  const bad = assertBuyExactOutputSemantics(data, {
    seriesId,
    optionUnits: 1n,
    maxUSDC6: 2_010_000n,
    deadline: 1_700_000_000n,
  });
  assert.ok(bad.some((i) => i.code === "AMOUNT_MISMATCH"));
});

test("semantic vault exercise decode", () => {
  const data = encodeVaultCalldata("exercise", 40_000_000n);
  assert.deepEqual(assertVaultActionSemantics(data, "exercise", 40_000_000n), []);
});

test("unsigned tx shape catches wrong chain/target", () => {
  const issues = assertUnsignedTxShape(
    {
      chainId: 1,
      from: `0x${"55".repeat(20)}`,
      to: `0x${"77".repeat(20)}`,
      data: "0x1234",
      value: "0",
      gasEstimateNative18: null,
      maxFeePerGasNative18: null,
      deadline: null,
    },
    {
      chainId: 31_337,
      from: `0x${"55".repeat(20)}`,
      to: `0x${"77".repeat(20)}`,
    },
  );
  assert.ok(issues.some((i) => i.code === "WRONG_CHAIN"));
});

test("OpenAPI generated from same schema module", () => {
  const doc = generateOpenApiDocument();
  assert.equal(doc.openapi, "3.1.0");
  const paths = doc.paths as Record<string, unknown>;
  assert.ok(paths["/v1/quotes"]);
  assert.ok(paths["/v1/actions/prepare"]);
  assert.ok(paths["/v1/transaction-intents"]);
});

test("transaction intent schema requires hash shape", () => {
  assert.throws(() =>
    TransactionIntentRequestSchema.parse({
      clientIntentId: "c1",
      account: `0x${"55".repeat(20)}`,
      chainId: 31337,
      action: "buyExactOutput",
      seriesId: `0x${"11".repeat(32)}`,
      transactionHash: "not-a-hash",
    }),
  );
});
