# Review bundle freeze outline

**Status:** outline ready for external engagement. **Audit badge: none.**

## 1. Freeze checklist (operator)

Before sending to a reviewer:

1. Choose commit SHA on the protocol line (recommended: merge of O00–O10 dry-run).
2. Record `git rev-parse HEAD`, branch name, and date (UTC).
3. Export `forge --version`, `solc` 0.8.26 settings from `foundry.toml`.
4. Pin dependency SHAs (see below) and confirm `foundry.lock` / submodule HEADs match.
5. Attach evidence directories `docs/evidence/o00`–`o10` and `docs/evidence/o09` threat/slither outputs.
6. Attach `deployments/arc-testnet.json` (**verified: false** until broadcast).
7. Confirm **no** plaintext deployer keys in repo or CI logs.
8. Do **not** claim “audited” in README/UI until Gate4 closes.

## 2. Compiler / build provenance (local)

| Item | Value |
| --- | --- |
| solc | 0.8.26 |
| optimizer | true / 200 runs |
| via_ir | true |
| foundry `evm_version` | `cancun` |
| Arc EVM | Osaka (≠ local Anvil) |
| License | Apache-2.0 (repo root) |

## 3. Dependency commits (protocol tip `fe6fb0f`)

| Dependency | Commit | Label |
| --- | --- | --- |
| Uniswap v4-core | `59d3ecf53afa9264a16bba0e38f4c5d2231f80bc` | Pairband-pinned; **not** official Arc listing |
| Uniswap v4-periphery | `dce236d4e2057422d0791d9a973a58765eb46f65` | Local POSM tests; Arc POSM deferred (no WETH) |
| OpenZeppelin | see `packages/contracts/foundry.lock` | |

## 4. Required attachments for reviewer

- Architecture map, threat model, authority matrix, known limitations (this folder)
- O09 invariant + adversarial results + Slither triage (`docs/evidence/o09/`)
- O10 dry-run + read-only Arc preflight (`docs/evidence/o10/`) — **no lifecycle tx hashes yet**
- Source under `packages/contracts/src/**`
- Domain model `packages/domain` (independent O02 accounting)
- Release gates `docs/reference/release-gates.md`

## 5. Explicitly out of scope until evidence exists

- External audit report / attestation
- Arc testnet lifecycle receipts (O10 broadcast pending)
- O26/O27 economic/customer validation (prerequisites for full O28 acceptance — **not complete**)
- Mainnet configuration (null)
- Legal opinion / Terms approval
