import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatUnits, parseUnits } from "./lib/api";
import { prepareSameAssetUsdcPay, referenceToMemoId } from "./lib/pay-tx";

describe("amount helpers", () => {
  it("round-trips units", () => {
    const raw = parseUnits("10,000.50", 6);
    assert.equal(raw, 10_000_500_000n);
    assert.equal(formatUnits(raw.toString(), 6), "10,000.5");
  });
});

describe("pay tx prep", () => {
  it("builds single Memo-wrapped USDC transfer", () => {
    const prepared = prepareSameAssetUsdcPay({
      payee: "0x1111111111111111111111111111111111111111",
      amount: 1_000_000n,
      reference: "INV-1042",
    });
    assert.equal(prepared.label, "Pay USDC + memo");
    assert.equal(prepared.to.toLowerCase(), "0x5294e9927c3306dcbadb03fe70b92e01ccede505");
    assert.ok(prepared.data.startsWith("0x"));
    assert.equal(prepared.gas, 350_000n);
    assert.match(referenceToMemoId("INV-1042"), /^0x[0-9a-f]{64}$/i);
  });
});
