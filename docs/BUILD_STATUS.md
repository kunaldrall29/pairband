# Status — Pairband pay rebuild

Source of truth: `docs/PAIRBAND_BUILD_PLAN.md`. Options product deleted.

| Item | Status |
|------|--------|
| Landing + outcome preview | Done |
| Chain config | Done |
| Pay USDC via Arc `Memo.memo` | Done (+ wait for inclusion) |
| Receipt + Activity (authz) | Done — SIWE required; onchain verify for settled |
| Workspace | Done |
| EURC / convert | Refuse-closed |
| Internal security + Arc verification | See `docs/review/SECURITY_AND_VERIFICATION_2026-09-09.md` |
| Professional external audit | **Not done — do not claim** |

## Test commands

```bash
pnpm test && pnpm typecheck
# with API up:
PAIRBAND_API_URL=http://127.0.0.1:3001 pnpm --filter @pairband/api exec tsx --test \
  src/security-functional.test.ts src/arc-live.test.ts
```
