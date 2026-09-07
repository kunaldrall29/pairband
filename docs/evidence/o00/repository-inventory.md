# Repository inventory — O00

Date: 2026-09-07
Branch: cursor/options-v2-bootstrap-4c19
Base: main @ e71267e

## Existing artifacts

| Path | Classification | Notes |
| --- | --- | --- |
| README.md | obsolete product wording | Described "FX liquidity and inventory management"; superseded by options-v2 |
| LICENSE | reusable infrastructure | Apache-2.0; preserved |
| .git | infrastructure | Fresh repo; single initial commit |

## Absent at inspection

- No package.json / lockfile / pnpm workspace
- No apps/, packages/, contracts, API, worker
- No AGENTS.md, .cursor/rules, CI
- No prior spot-band, attestation, payment-platform, or ERC-4626 vault code in tree
- No Foundry/forge installed in this environment yet
- No Docker Compose, Postgres, or Anvil services yet

## Migration disposition

- Historical README wording retained in git history; replaced for active product direction
- No deployed contract paths or claim interfaces to preserve
- Greenfield options-v2 bootstrap is appropriate
- Event eligibility: all options-v2 work begins at this bootstrap commit series
