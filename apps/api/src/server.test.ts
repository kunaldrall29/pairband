import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { maxAmountInFromBand } from "@pairband/domain";

describe("api domain wiring", () => {
  it("band helper remains available to api package", () => {
    const max = maxAmountInFromBand(1_000_000n, 10n ** 18n, 15);
    assert.equal(max, 1_001_500n);
  });
});
