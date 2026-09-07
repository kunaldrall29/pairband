import assert from "node:assert/strict";
import { test } from "node:test";
import { loadEnv } from "@pairband/config";

test("worker env loads in preview with email disabled", () => {
  const env = loadEnv({ PAIRBAND_MODE: "preview", EMAIL_PROVIDER: "disabled" });
  assert.equal(env.PAIRBAND_MODE, "preview");
  assert.equal(env.EMAIL_PROVIDER, "disabled");
});
