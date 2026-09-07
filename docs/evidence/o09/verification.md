# O09 — Adversarial / invariant verification

**Status:** complete (local). **Not audited. Not Arc-deployed.**

## Artifacts

| Path | Role |
| --- | --- |
| `packages/contracts/test/ghost/IndependentSeriesModel.sol` | O02-twin ghost accounting |
| `packages/contracts/test/invariant/SeriesVaultHandler.sol` | Multi-actor fuzz handler (2 series) |
| `packages/contracts/test/invariant/SeriesVaultInvariant.t.sol` | Stateful invariants |
| `packages/contracts/test/Adversarial.t.sol` | Permission / phase / donation / LP exit / model agree |
| `docs/evidence/o09/threat-register.md` | Threat coverage map |
| `docs/evidence/o09/slither-output.txt` | Slither 0.11.6 on `src/` |
| `docs/evidence/o09/arc-carryforward.md` | Local≠Arc gaps → O10 |

## Commands run

```text
forge test
# 47 passed (incl. SeriesVaultInvariantTest 256 runs / 128000 calls / 0 reverts)

slither src --exclude-dependencies --filter-paths 'lib/'
# Slither 0.11.6 — 22 results; triage in threat-register (not an audit)
```

## Honesty

- Independent ghost matches vault counters under fuzz; this is **not** a professional security audit.
- LP/router adversarial paths lean on O06–O08 tests plus AdversarialSuite LP decrease/deadline cases.
- Arc runtime (Osaka, blocklist, Multicall3From) remains O10.
