# O13 evidence — Quote and unsigned transaction API

**Date:** 2026-09-07  
**Branch:** `cursor/api-ui-foundations-4c19`

## Implemented

- Zod runtime schemas in `@pairband/sdk` (`QuoteRequest`, `PrepareRequest`, `TransactionIntent*`, responses)
- OpenAPI 3.1 generated from the same module (`generateOpenApiDocument` → `GET /v1/openapi.json`)
- Semantic calldata encode/decode asserts for router buyExactOutput and vault actions
- Fixture-labeled exact-output buy quotes when `INDEXER_MODE=fixture|anvil` (`executable:false`, no unsigned tx)
- Prepare blocked in preview/unverified; semantic checks when verified
- `POST /v1/transaction-intents` monitoring only (202, never settlement)

## Tests

- `pnpm --filter @pairband/sdk test` (includes o13 schemas/semantics/openapi)
- `pnpm --filter @pairband/api test`

## Honesty

- No fabricated Arc live premiums
- Fixture quotes cannot prepare real txs in preview
- Not audited; not mainnet-ready
