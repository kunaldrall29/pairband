# Pairband agent

Propose-only CLI + MCP tools. **Never** call `executeRebalance`. Curator keys stay on the curator machine.

```bash
pnpm --filter @pairband/agent build
export PAIRBAND_AGENT_KEY=0x...   # operator machine only
pnpm pairband suggest --tick 0 --spacing 60 --max-width 600 --max-shift 240 --lower -120 --upper 120
pnpm pairband propose --vault 0x... --rpc $RPC_URL --tick 0
```

`suggestBand` is pure deterministic TypeScript mirroring `BandMath` — LLMs may only write explanation copy via `explain_proposal`.
