import assert from "node:assert/strict";
import { test } from "node:test";
import { tokens, formatAmount, nextTxPhase, emptyStateCopy, networkBadgeLabel } from "./index.js";

test("tokens match landing spec", () => {
  assert.equal(tokens.action, "#087F75");
  assert.equal(tokens.sidebarWidthPx, 224);
  assert.equal(tokens.topBarHeightPx, 64);
});

test("formatAmount distinguishes units", () => {
  assert.equal(formatAmount(110_000_000n, "USDC"), "110 USDC");
  assert.equal(formatAmount(100_000_000n, "option"), "100 options");
  assert.match(formatAmount(1_100_000n, "USDC_per_EURC"), /USDC\/EURC/);
});

test("tx machine and empty states", () => {
  assert.equal(nextTxPhase("editing", "validate"), "validating");
  assert.equal(nextTxPhase("awaiting_action_signature", "reject"), "rejected");
  assert.equal(nextTxPhase("submitted", "unknown"), "unknown");
  assert.match(emptyStateCopy("markets").body, /does not invent quotes/);
  assert.equal(networkBadgeLabel({ mode: "preview" }), "Product preview");
  assert.equal(networkBadgeLabel({ mode: "testnet", wrongNetwork: true }), "Wrong network");
});
