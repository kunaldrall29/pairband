# Authority matrix

| Action | Who | Mechanism | Can it seize user backing? | Notes |
| --- | --- | --- | --- | --- |
| Create series | Factory owner | `createSeries` | No | Immutable terms after create |
| Pause new risk | Factory owner | `setNewRiskPaused` | No | Blocks mint + trading add/swap via hook; cancel/exercise/redeem/LP remove remain |
| Register/initialize pool | Launcher owner | `registerAndInitialize*` | No | Once per series; price frozen at init |
| Set hook launcher | Deployer (once) | `setMarketLauncher` | No | Cannot reset |
| Mint / cancel / exercise / redeem | Token holders | Vault public fns | N/A | Phase gated; recipients = `msg.sender` |
| Buy / sell options | Traders | `PairbandRouter` | No | Payer/recipient = entry `msg.sender` |
| LP add (trading) | Makers | POSM / modifyLiquidity | No | Hook blocks after cutoff / pause |
| LP decrease / collect | NFT/position owner | POSM / modifyLiquidity | No | Allowed after trading cutoff |
| Deploy contracts | Managed deployer | `DeployPairband` + broadcast gate | N/A | Requires `PAIRBAND_ALLOW_BROADCAST` + auth |
| Arc USDC blocklist | Circle / Arc | Protocol | Can block transfers involving listed addrs | External; fixture `0x7099…79C8` |
| Protocol fee receive | Immutable fee recipient | Mint fee transfer | Receives fee only | Not vault accounting |
| Rescue / upgrade vault | — | **None** | — | Nonupgradeable; no rescue |
| Independent audit sign-off | External reviewer | Off-chain report | — | **Pending** |
| Legal clearance | Counsel | Off-chain memo | — | **Pending** |
| Funded pilot go-live | Founder + gates | Readiness ledger Gate4 | — | **Blocked** |
| Mainnet release | Gate5 owners | Release gates | — | **Blocked** |

## Incident roles (draft — not staffed)

| Role | Responsibility |
| --- | --- |
| Protocol lead | Pause new risk if exploit in mint/trade path; communicate scope |
| Deployer ops | Key custody; never browser wallets for deployer |
| Reviewer | Independent of implementer |
| Counsel | Jurisdiction/eligibility conclusions |
| Maker ops | Inventory/spreads during pilot |

Generic shutdown **must not** erase exercise/redemption obligations for open series.
