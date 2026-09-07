# O09 — Threat register (local)

**Not an audit.** Coverage map for adversarial/invariant suite. Status = local Foundry evidence only.

| ID | Threat | Expected control | Evidence | Status |
| --- | --- | --- | --- | --- |
| T01 | Unbacked claim mint | ClaimToken mint/burn only vault | `AdversarialSuiteTest.test_unauthorizedClaimMintReverts` | covered |
| T02 | Unauthorized admin pause | Factory `onlyOwner` | `test_unauthorizedPauseReverts` | covered |
| T03 | Forged hook launcher / double register | Launcher once; hook rejects duplicate | `test_unauthorizedHookLauncherReverts`, `test_forgedPoolRegistrationReverts` | covered |
| T04 | USDC/EURC donation inflates claims | Donations excluded from accounted | `test_donationDoesNotMintClaims_*`, invariant balances ≥ accounted | covered |
| T05 | Cross-series contamination | Dual vault ghosts independent | `invariant_noCrossSeriesContamination`, dual ghost match | covered |
| T06 | Fee mixed into backing | Fee paid to recipient; not accounted | `invariant_feeRecipientSeparateFromBacking` | covered |
| T07 | Phase permission bypass | Mint/cancel/exercise/redeem windows | `test_phasePermissions_*`, handler warps | covered |
| T08 | Pause traps exits | Pause blocks mint only; cancel/LP/redeem OK | `test_pauseBlocksMintNotCancelOrLpExitOrRedeem` | covered |
| T09 | Post-cutoff LP trapped | Decrease/collect after exerciseStart | Maker/POSM E2E + adversarial LP decrease | covered |
| T10 | Stale router deadline | `DeadlineExpired` | `test_deadlineEndpoints_router` | covered |
| T11 | Zero-amount mint/trade | Revert | `test_zeroAmountsRevert` | covered |
| T12 | Ghost vs vault divergence | Independent O02 twin | invariants ghostMatches A/B; mixed sequence unit | covered |
| T13 | Split vs batch redeem drift | Cumulative allocation telescopes | `test_splitVsBatchRedeemConservation` | covered |
| T14 | Long/receipt supply mismatch | Supply ↔ writer/exercised/redeemed | supply invariants | covered |
| T15 | Privileged rescue/delegatecall | Manual + grep: none in `src/` | `test_sourceHasNoRescue*`, slither notes | covered (review) |
| T16 | Reentrant ERC20 surrogate | Vault `nonReentrant` + exact pull | Unit + slither reentrancy-* triage | triage |
| T17 | Arc Multicall3From / Osaka sender | Not local-simulable | Carry to O10 | open (O10) |
| T18 | Official Uniswap Arc periphery | Absent | Carry listing gate | open |

## Slither triage (v0.11.6)

See `slither-output.txt`. 22 findings; none treated as confirmed critical without exploit path in suite:

- `reentrancy-*` / `reentrancy-events`: vault is `nonReentrant`; ClaimToken burn is trusted vault-controlled ERC20 (no hook). Router unlock is PoolManager callback pattern — keep under O28 review.
- `uninitialized-local` on redeem locals: set before use when `snapshotW0 != 0`; else remain 0 — benign.
- `unused-return` on v4 `initialize`/`swap`/`markets`: intentional discard of unused tuple fields.
- `timestamp`: intentional phase/deadline checks.
- `low-level-calls`: decimals `staticcall` in factory.
- Green scan ≠ audit.

## Minimized seeds

Invariant default: 256 runs × 500 depth (Foundry defaults in this env → 128000 calls, 0 reverts). No failing seed retained (suite green).
