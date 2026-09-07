# O15 stub evidence — Durable workers / outbox

**Status:** scaffolding (prereq O12 not complete; email provider disabled)

- `outbox_jobs` table with dedupe keys, SKIP LOCKED leases, retry/dead-letter
- `apps/worker` claims jobs; with `EMAIL_PROVIDER=disabled` marks local capture only — no send claimed
- Core product has no worker dependency for exercise/redeem

Next: after O12, schedule reminder jobs from immutable series windows + verified consent only.
