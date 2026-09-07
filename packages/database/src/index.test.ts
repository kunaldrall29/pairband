import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DATABASE_SCHEMA_VERSION,
  createPool,
  listMigrationIds,
  migrateUp,
  migrationsPending,
  normalizeEmail,
} from "./index.js";
import { upsertEarlyAccess, countEarlyAccess } from "./queries/early-access.js";
import { createAuthNonce, consumeAuthNonce, createSession, lookupSession } from "./queries/auth.js";
import { enqueueOutboxJob, claimOutboxJobs, completeOutboxJob } from "./queries/outbox.js";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://pairband:pairband@127.0.0.1:5432/pairband";

test("schema version and migration ids", () => {
  assert.equal(DATABASE_SCHEMA_VERSION, 1);
  assert.deepEqual(listMigrationIds(), ["001_init"]);
  assert.equal(migrationsPending([]), true);
  assert.equal(normalizeEmail("  A@B.COM "), "a@b.com");
});

test("migrations + early access dedupe + auth nonce + outbox", async () => {
  const pool = createPool(databaseUrl);
  try {
    await migrateUp(pool);
    // isolate
    await pool.query(`DELETE FROM early_access_requests`);
    await pool.query(`DELETE FROM auth_nonces`);
    await pool.query(`DELETE FROM sessions`);
    await pool.query(`DELETE FROM outbox_jobs`);

    const first = await upsertEarlyAccess(pool, {
      email: "Builder@Example.com",
      role: "researcher",
      privacyAcknowledged: true,
      privacyVersion: "2026-09-07",
      productUpdatesOptIn: false,
      clientRequestId: "req-1",
    });
    const second = await upsertEarlyAccess(pool, {
      email: "builder@example.com",
      role: "integrator",
      privacyAcknowledged: true,
      privacyVersion: "2026-09-07",
      productUpdatesOptIn: true,
      clientRequestId: "req-2",
    });
    assert.equal(first.inserted, true);
    assert.equal(second.inserted, false);
    assert.equal(await countEarlyAccess(pool), 1);

    const addr = "0x1111111111111111111111111111111111111111";
    const nonce = await createAuthNonce(pool, {
      address: addr,
      domain: "localhost",
      uri: "http://localhost:3000",
      chainId: 5042002,
    });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const ok = await consumeAuthNonce(client, nonce.nonce, {
        address: addr,
        domain: "localhost",
        uri: "http://localhost:3000",
        chainId: 5042002,
      });
      assert.equal(ok.ok, true);
      const replay = await consumeAuthNonce(client, nonce.nonce, {
        address: addr,
        domain: "localhost",
        uri: "http://localhost:3000",
        chainId: 5042002,
      });
      assert.equal(replay.ok, false);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }

    const wrong = await createAuthNonce(pool, {
      address: addr,
      domain: "localhost",
      uri: "http://localhost:3000",
      chainId: 5042002,
    });
    const badDomain = await consumeAuthNonce(pool, wrong.nonce, {
      address: addr,
      domain: "evil.example",
      uri: "http://localhost:3000",
      chainId: 5042002,
    });
    assert.equal(badDomain.ok, false);

    const session = await createSession(pool, addr, 60);
    const looked = await lookupSession(pool, session.token);
    assert.equal(looked?.address.toLowerCase(), addr.toLowerCase());

    const job = await enqueueOutboxJob(pool, {
      dedupeKey: "test:email:1",
      kind: "local_capture",
      payloadReference: { note: "provider disabled" },
    });
    const dup = await enqueueOutboxJob(pool, {
      dedupeKey: "test:email:1",
      kind: "local_capture",
      payloadReference: { note: "dup" },
    });
    assert.equal(job.created, true);
    assert.equal(dup.created, false);
    assert.equal(dup.jobId, job.jobId);
    const claimed = await claimOutboxJobs(pool, { limit: 5 });
    assert.ok(claimed.some((j) => j.jobId === job.jobId));
    await completeOutboxJob(pool, job.jobId);
  } finally {
    await pool.end();
  }
});
