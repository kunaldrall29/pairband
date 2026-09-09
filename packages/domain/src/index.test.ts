import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkBand,
  isQuoteExpired,
  maxAmountInFromBand,
  midAmountIn,
  sameAssetPayPreview,
  validateMemo,
} from "./index";

describe("band math", () => {
  it("computes mid amountIn for 10_000 EURC at 1.08", () => {
    const amountOut = 10_000n * 10n ** 6n;
    const midRay = 108n * 10n ** 16n; // 1.08e18
    assert.equal(midAmountIn(amountOut, midRay), 10_800n * 10n ** 6n);
  });

  it("allows fill inside 15 bps", () => {
    const amountOut = 10_000n * 10n ** 6n;
    const midRay = 108n * 10n ** 16n;
    const max = maxAmountInFromBand(amountOut, midRay, 15);
    assert.equal(max, 10_816_200_000n); // 10800e6 + 0.15% = 10816.2e6
    const ok = checkBand({
      amountOut,
      amountInInclusiveFees: 10_810n * 10n ** 6n,
      midRay,
      bandBps: 15,
    });
    assert.equal(ok.ok, true);
  });

  it("refuses fill outside band", () => {
    const amountOut = 10_000n * 10n ** 6n;
    const midRay = 108n * 10n ** 16n;
    const result = checkBand({
      amountOut,
      amountInInclusiveFees: 10_900n * 10n ** 6n,
      midRay,
      bandBps: 15,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "no_executable_route");
  });

  it("same-asset pay equals exact out", () => {
    assert.deepEqual(sameAssetPayPreview(1_000_000n), {
      amountIn: 1_000_000n,
      bandApplicable: false,
    });
  });
});

describe("quote expiry and memo", () => {
  it("detects expired quotes", () => {
    assert.equal(isQuoteExpired(1_000, 1_000), true);
    assert.equal(isQuoteExpired(1_001, 1_000), false);
  });

  it("validates memo charset", () => {
    assert.equal(validateMemo("INV-1042").ok, true);
    assert.equal(validateMemo("").ok, false);
    assert.equal(validateMemo("bad\nline").ok, false);
  });
});
