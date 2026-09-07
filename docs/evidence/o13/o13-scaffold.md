# O13 scaffold evidence — Quote / unsigned tx API (started)

**Status:** scaffold after O12 — not complete

- SDK encode helpers for PairbandRouter `buyExactOutput` / `sellExactInput` + POSM action planners
- API: `POST /v1/quotes` returns honest `UNVERIFIED`/`NOT_IMPLEMENTED` (no fabricated premiums)
- API: `POST /v1/actions/prepare` blocked in preview; scaffold args only when manifest verified + router present
- Full OpenAPI generation + mint/cancel/exercise/redeem prepare remain next

No unsigned transaction is returned as executable in preview without verified deployment.

## Follow-up in same session

- Vault encode helpers: mint/cancel/exercise/redeem/finalize
- `/v1/actions/prepare` accepts vault actions when manifest allows + vault target present
- OpenAPI scaffold: `apps/api/openapi/o13-scaffold.yaml` (not generated client yet)
