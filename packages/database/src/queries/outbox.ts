import type { DbClient } from "../index.js";

export type OutboxJob = {
  jobId: string;
  dedupeKey: string;
  kind: string;
  payloadReference: unknown;
  status: string;
  attempts: number;
};

/** Transactional enqueue with dedupe. Returns existing job id when key already present. */
export async function enqueueOutboxJob(
  db: DbClient,
  input: { dedupeKey: string; kind: string; payloadReference: unknown; nextRunAt?: Date },
): Promise<{ jobId: string; created: boolean }> {
  const existing = await db.query<{ job_id: string }>(
    `SELECT job_id::text AS job_id FROM outbox_jobs WHERE dedupe_key = $1`,
    [input.dedupeKey],
  );
  if (existing.rows[0]) {
    return { jobId: existing.rows[0].job_id, created: false };
  }
  const inserted = await db.query<{ job_id: string }>(
    `INSERT INTO outbox_jobs (dedupe_key, kind, payload_reference, next_run_at)
     VALUES ($1, $2, $3::jsonb, COALESCE($4, now()))
     RETURNING job_id::text AS job_id`,
    [
      input.dedupeKey,
      input.kind,
      JSON.stringify(input.payloadReference ?? {}),
      input.nextRunAt ?? null,
    ],
  );
  return { jobId: inserted.rows[0]!.job_id, created: true };
}

/** Claim ready jobs with SKIP LOCKED and expiring leases (Postgres-only; no Redis). */
export async function claimOutboxJobs(
  db: DbClient,
  opts: { limit?: number; leaseSeconds?: number; workerId?: string } = {},
): Promise<OutboxJob[]> {
  const limit = opts.limit ?? 10;
  const leaseSeconds = opts.leaseSeconds ?? 60;
  const res = await db.query<{
    job_id: string;
    dedupe_key: string;
    kind: string;
    payload_reference: unknown;
    status: string;
    attempts: number;
  }>(
    `WITH ready AS (
       SELECT job_id
       FROM outbox_jobs
       WHERE status IN ('pending', 'retry')
         AND next_run_at <= now()
         AND (lease_until IS NULL OR lease_until < now())
       ORDER BY next_run_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT $1
     )
     UPDATE outbox_jobs j
     SET status = 'leased',
         attempts = j.attempts + 1,
         lease_until = now() + ($2::text || ' seconds')::interval,
         updated_at = now()
     FROM ready
     WHERE j.job_id = ready.job_id
     RETURNING j.job_id::text AS job_id, j.dedupe_key, j.kind, j.payload_reference, j.status, j.attempts`,
    [limit, String(leaseSeconds)],
  );
  return res.rows.map((r) => ({
    jobId: r.job_id,
    dedupeKey: r.dedupe_key,
    kind: r.kind,
    payloadReference: r.payload_reference,
    status: r.status,
    attempts: r.attempts,
  }));
}

export async function completeOutboxJob(db: DbClient, jobId: string): Promise<void> {
  await db.query(
    `UPDATE outbox_jobs SET status = 'delivered', lease_until = NULL, updated_at = now() WHERE job_id = $1::uuid`,
    [jobId],
  );
}

export async function failOutboxJob(
  db: DbClient,
  jobId: string,
  error: string,
  opts: { deadLetter?: boolean; retryDelaySeconds?: number } = {},
): Promise<void> {
  if (opts.deadLetter) {
    await db.query(
      `UPDATE outbox_jobs
       SET status = 'dead', last_error = $2, lease_until = NULL, updated_at = now()
       WHERE job_id = $1::uuid`,
      [jobId, error.slice(0, 2000)],
    );
    return;
  }
  const delay = opts.retryDelaySeconds ?? 30;
  await db.query(
    `UPDATE outbox_jobs
     SET status = CASE WHEN attempts >= max_attempts THEN 'dead' ELSE 'retry' END,
         last_error = $2,
         lease_until = NULL,
         next_run_at = now() + ($3::text || ' seconds')::interval,
         updated_at = now()
     WHERE job_id = $1::uuid`,
    [jobId, error.slice(0, 2000), String(delay)],
  );
}

export async function outboxHealth(db: DbClient): Promise<{
  pending: number;
  leased: number;
  dead: number;
}> {
  const res = await db.query<{ status: string; c: string }>(
    `SELECT status, count(*)::text AS c FROM outbox_jobs GROUP BY status`,
  );
  const map = Object.fromEntries(res.rows.map((r) => [r.status, Number(r.c)]));
  return {
    pending: (map.pending ?? 0) + (map.retry ?? 0),
    leased: map.leased ?? 0,
    dead: map.dead ?? 0,
  };
}
