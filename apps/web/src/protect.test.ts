import assert from "node:assert/strict";
import { test } from "node:test";
import { nextTxPhase } from "@pairband/ui";
import { optionUnitsFromEurcExposure } from "@pairband/domain";

test("protect exposure maps to exact option units", () => {
  const r = optionUnitsFromEurcExposure("10000");
  assert.equal(r.optionUnits, 100_000_000n);
  assert.equal(r.unprotectedRemainder6, 0n);
});

test("submitted is not purchased without confirmed transition", () => {
  let phase = nextTxPhase("editing", "validate");
  phase = nextTxPhase(phase, "validated");
  phase = nextTxPhase(phase, "review");
  phase = nextTxPhase(phase, "sign_action");
  phase = nextTxPhase(phase, "submitted");
  assert.equal(phase, "submitted");
  // Must not jump to confirmed without explicit evidence event
  assert.notEqual(phase, "confirmed");
  phase = nextTxPhase(phase, "confirmed");
  assert.equal(phase, "confirmed");
});

test("wallet reject returns to recoverable editing via reset", () => {
  let phase = nextTxPhase("reviewing", "sign_action");
  phase = nextTxPhase(phase, "reject");
  assert.equal(phase, "rejected");
  phase = nextTxPhase(phase, "reset");
  assert.equal(phase, "editing");
});
