# Local setup — O00

## Requirements

- Node.js 22 LTS
- pnpm 10.x
- Python 3 (fixture verification)
- Optional: Docker (Postgres), Foundry (contracts from O03)

## Commands

```bash
pnpm install
cp .env.example .env   # keep PAIRBAND_MODE=preview
pnpm test:fixtures
pnpm typecheck
pnpm --filter @pairband/web dev
pnpm --filter @pairband/api dev
```

Preview landing must show mode label. Financial actions remain disabled until verified deployment + non-preview mode.
