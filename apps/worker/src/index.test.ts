import assert from "node:assert/strict";
import { test } from "node:test";
import { loadEnv } from "@pairband/config";

test("worker defaults to preview", () => {
  const env = loadEnv({});
  assert.equal(env.PAIRBAND_MODE, "preview");
});
