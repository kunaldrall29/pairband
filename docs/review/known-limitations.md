# Known limitations (honest)

Do not convert these into marketing claims.

## Security / review

- **No professional audit** and no independent review report.
- Local forge (47 tests) + Slither triage ≠ audit.
- O28 prerequisites O26/O27 (economics / customer evidence) are **not complete**; this package is preparatory.

## Deployment / network

- **O10 broadcasts pending** authorization — no Arc contract addresses or lifecycle tx hashes.
- Official **Uniswap v4 not listed on Arc**; any PoolManager must be labeled **Pairband-deployed testnet instance**.
- Local Foundry `cancun` ≠ Arc **Osaka**.
- **PositionManager on Arc deferred** — Arc has no WETH; native USDC is already IERC20.
- Mainnet fields remain **null**.

## Product economics

- Issuance fee default/demo may be 0 bps; cap ≠ recommended pricing.
- No claim of deep liquidity, fair premium, or validated maker P&L (O27 pending).
- Educational payoff charts ≠ settlement oracle.

## UX / integrations

- App Kit does **not** swap Pairband option tokens.
- Optional O24/O25/O32 disabled.
- Preview mode must not prepare financial transactions (`assertManifestAllowsActions`).

## Operational

- Factory `newRiskPaused` cannot erase existing cancel/exercise/redeem/LP-exit rights — but key compromise of owner still a live operational risk.
- Missed exercise leaves longs worthless; writers redeem remaining reserves — disclose clearly.
- Network/issuer outages are external; pilot runbooks must cover them without inventing recovery that alters immutable terms.
