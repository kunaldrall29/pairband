import assert from "node:assert/strict";
import { test } from "node:test";

test("preview is the default public mode", () => {
  const mode = process.env.NEXT_PUBLIC_PAIRBAND_MODE ?? "preview";
  assert.equal(mode, "preview");
});
