# Pairband agent

Propose-only CLI + MCP tools. **Never** call `executeRebalance`. Curator keys stay on the curator machine.

```bash
# 1) Copy env (gitignored). Demo key lives in packages/agent/.env — operator machine only.
cp packages/agent/.env.example packages/agent/.env   # or use the repo-root .env

# 2) Build + verify address
pnpm --filter @pairband/agent build
pnpm agent:whoami

# 3) Suggest ticks (no key needed) / propose (uses PAIRBAND_AGENT_KEY)
pnpm --filter @pairband/agent start -- suggest --tick 0 --spacing 60 --max-width 600 --max-shift 240 --lower -120 --upper 120
pnpm --filter @pairband/agent propose -- --vault 0x... --rpc $RPC_URL --tick 0
```

`suggestBand` is pure deterministic TypeScript mirroring `BandMath` — LLMs may only write explanation copy via `explain_proposal`.

**Never** put `PAIRBAND_AGENT_KEY` / `PRIVATE_KEY` in `NEXT_PUBLIC_*` or MCP client config for user funds.
