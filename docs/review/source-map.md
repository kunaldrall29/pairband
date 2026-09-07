# Source map — privileged & sensitive paths

Paths relative to repo root. Reviewers should start here.

## Contracts (`packages/contracts/src`)

| Path | Role | Privilege |
| --- | --- | --- |
| `SeriesFactory.sol` | Create series; `setNewRiskPaused` | `Ownable` owner |
| `SeriesVault.sol` | Mint/cancel/exercise/redeem; accounting | Public phase-gated; `nonReentrant` |
| `ClaimToken.sol` | Long / receipt ERC-20 | `mint`/`burn` **only vault** |
| `hooks/PairbandLifecycleHook.sol` | beforeInitialize / beforeSwap / beforeAddLiquidity | PoolManager callbacks; launcher set once |
| `MarketLauncher.sol` | Register + initialize pool | `onlyOwner` |
| `PairbandRouter.sol` | buyExactOutput / sellExactInput | User `msg.sender` payer; unlock callback |
| `PairbandQuoter.sol` | eth_call quote | No broadcast settlement |
| `libraries/HookMiner.sol` | CREATE2 salt mine | Deploy-time |
| `libraries/OptionTickMath.sol` | Premium ↔ tick helpers | Pure math |
| `libraries/CurrencyPay.sol` | Router settle helpers | Internal |

**Absent by design (grep/O09):** `delegatecall`, `selfdestruct`, admin `rescue`/`sweep` of vault reserves, arbitrary recipient on vault exits.

## Tests / static analysis

| Path | Role |
| --- | --- |
| `test/invariant/*` | Stateful ghost invariants |
| `test/Adversarial.t.sol` | Permission / phase / donation / LP exit |
| `test/PositionManagerE2E.t.sol` | Real POSM NFT path (local) |
| `docs/evidence/o09/slither-output.txt` | Slither 0.11.6 triage |

## Deploy / Arc

| Path | Role |
| --- | --- |
| `script/DeployPairband.s.sol` | Dry-run default; broadcast gated |
| `script/o10_arc_readonly_preflight.py` | Read-only RPC checks |
| `deployments/arc-testnet.json` | Manifest — contracts null until broadcast |

## Domain / SDK

| Path | Role |
| --- | --- |
| `packages/domain/src/index.ts` | `SeriesAccountingModel` (O02) |
| `packages/sdk/src/index.ts` | Router + POSM planner helpers |

## Periphery approvals (review note)

- Vault: user approves USDC (and EURC for exercise) to vault.
- Router: user approves USDC / long to router.
- POSM (local): token → Permit2 → PositionManager allowance. Arc POSM deferred (no WETH).
