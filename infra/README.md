# Infrastructure notes (O00)

- `docker-compose.yml` at repo root defines Postgres 16 and Anvil for local use.
- Docker CLI was not present in the O00 Cloud Agent environment; services were not started.
- Foundry/forge was not installed; `packages/contracts` remains a placeholder until a standard Foundry install is available.
- Production/deploy runbooks arrive in later stages (O29). Do not broadcast or publish from this scaffold.
