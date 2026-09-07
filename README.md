# Pairband

USDC-backed EURC options on Arc, with Uniswap v4 option-token markets (**options-v2**).

This repository is bootstrapped from the options-v2 specification kit. It is **not** a completed application, audited protocol, or live market. Default mode is `preview`.

## Quick start

Requirements: **Node.js ≥ 22**, **pnpm 10.33.3**.

```bash
pnpm install
cp .env.example .env   # PAIRBAND_MODE=preview by default; no secrets included
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @pairband/web dev    # http://localhost:3000 — labeled preview
pnpm --filter @pairband/api dev    # http://localhost:3001/health
```

Workspace layout (protocol §8):

| Path | Role |
| --- | --- |
| `apps/web` | Next.js landing + app shell (preview-labeled) |
| `apps/api` | Fastify API stub (`/health`, `/ready`) |
| `apps/worker` | Indexer/reminder worker stub |
| `packages/domain` | Integer units / phase helpers |
| `packages/sdk` | Manifest checks; ABIs later |
| `packages/ui` | Design tokens |
| `packages/config` | Typed env schemas |
| `packages/contracts` | Foundry placeholder (Foundry not installed yet) |
| `packages/database` | Postgres schema placeholder |
| `docs/` | MASTER_CONTEXT, reference/, prompts/, fixtures/, evidence |
| `deployments/` | `arc-testnet.json` (unverified), `arc-mainnet.json` (null) |

## Local Postgres / Anvil

`docker-compose.yml` defines Postgres and Anvil for local development. **Docker is not available in this Cloud Agent environment**, so compose services were not started here. On a machine with Docker:

```bash
docker compose up -d
# Postgres: localhost:5432 (user/pass/db: pairband)
# Anvil:    localhost:8545
docker compose down
```

Do not treat local Anvil as Arc. Arc RPC verification is O01.

## Documentation

- Start: [docs/START_HERE.md](docs/START_HERE.md)
- Protocol: [docs/reference/protocol.md](docs/reference/protocol.md)
- Stages: [docs/README.md](docs/README.md)
- Status: [docs/BUILD_STATUS.md](docs/BUILD_STATUS.md)
- Agent rules: [AGENTS.md](AGENTS.md)

## License

Apache-2.0 — see [LICENSE](LICENSE).
