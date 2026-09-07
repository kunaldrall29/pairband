# Build status

Product: Pairband options-v2. Mode default: preview.

| Stage | Status | Commit | Evidence | Blocker / next step |
| --- | --- | --- | --- | --- |
| O00 | complete | 0c99d7c | docs/evidence/o00/ | Next: O01 dependency/Arc/Uniswap preflight |
| O01 | pending | — | — | Requires O00 evidence |
| O02–O32 | pending | — | — | Follow docs/prompt-index.json |

Optional O24/O25/O32: disabled.

### O00 verification (executed)

- `pnpm install` — success
- `pnpm typecheck` — success (packages + apps)
- `pnpm lint` — success
- `pnpm test:fixtures` — 2,000 randomized allocation cases passed
- `@pairband/config|domain|sdk|api|worker` unit tests — pass
- `pnpm --filter @pairband/web build` — Next.js preview build success
- Foundry/forge — **not installed** (blocker for O03+)
- Docker — not required for O00 acceptance; compose file present
- Arc RPC / official Uniswap Arc deployments — deferred to O01
- Mainnet fields — null by design
- Vercel — not linked (`.vercel/project.json` absent)

### Labels

Scaffold is **preview** only. Not audited. Not Arc-verified. Not deployment-ready.
