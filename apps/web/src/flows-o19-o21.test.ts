import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mintObligations,
  exerciseObligations,
  redeemPayout,
  parseWholeOptions,
  ILLUSTRATIVE_WRITER_LOSS,
  phaseAt,
} from "@pairband/domain";
import { buildFixtureSellQuote } from "@pairband/sdk";

test("O19 mint obligations separate fee from backing", () => {
  const units = parseWholeOptions("100");
  const m = mintObligations(units, 110n, 0);
  assert.equal(m.collateral6, 11_000_000_000n);
  assert.equal(m.fee6, 0n);
  const taxed = mintObligations(units, 110n, 50);
  assert.ok(taxed.fee6 > 0n);
});

test("O19 writer illustrative loss fixture intact", () => {
  assert.equal(ILLUSTRATIVE_WRITER_LOSS.illustrativeLossUsdc, 800n);
});

test("O20 phase filters use domain phaseAt", () => {
  assert.equal(phaseAt(1500n, 1000n, 2000n, 3000n), "trading");
  assert.equal(phaseAt(2500n, 1000n, 2000n, 3000n), "exercise");
});

test("O20 fixture sell quote is indicative non-executable", () => {
  const q = buildFixtureSellQuote({
    seriesId: `0x${"11".repeat(32)}`,
    side: "sell",
    optionUnits: "100000000",
    account: `0x${"55".repeat(20)}`,
    slippageBps: 50,
  });
  assert.equal(q.side, "sell");
  assert.equal(q.executable, false);
  assert.ok(q.minUSDC6);
});

test("O21 exercise and redeem previews", () => {
  const ex = exerciseObligations(40_000_000n, 110n);
  assert.equal(ex.eurcIn6, 4_000_000_000n);
  const r = redeemPayout(100_000_000n, 6_600_000_000n, 4_000_000_000n, 0n, 60_000_000n);
  assert.equal(r.usdc6, 3_960_000_000n);
  assert.equal(r.eurc6, 2_400_000_000n);
});
