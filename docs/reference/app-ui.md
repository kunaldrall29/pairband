
# Pairband — app UI and interaction specification

Version 2.0 · 7 September 2026 · EURC puts backed by USDC

This specification replaces the old spot-swap, attested-payment and operator console flows. Build a working DeFi app around four primary destinations: **Protect, Earn, Markets and Portfolio**. Advanced liquidity management lives inside a market detail page. Activity and notification preferences live under Portfolio.

## 1. Product contract with the user

The app must show what the user pays, what they receive, which assets remain locked, who can move them and when action is required. It must never imply automatic exercise, guaranteed selling liquidity or risk-free writer income.

The initial series is a physically settled EURC put. One displayed option token represents the right to deliver 100 EURC for the series' fixed USDC amount. Fractional options are supported to six decimals; EURC exposure increments are 0.0001 EURC. At a 1.10 USDC/EURC strike, one displayed option requires 110 USDC backing. Option and writer receipt token decimals are six. Contract calculations use integer raw units, specified in the technical document.

An option buyer and a writer receipt holder have different claims. Buying an option never gives a claim to unused writer collateral. A writer receipt never gives a right to exercise. A Uniswap LP NFT holds a trading position and is a third asset type.

## 2. Shell, routes and responsive behavior

| Route | Purpose |
| --- | --- |
| `/protect` | Guided option purchase for an EURC exposure |
| `/earn` | Understand, mint and sell USDC-backed options |
| `/markets` | Filter available series and compare executable quotes |
| `/markets/[seriesId]` | Series terms, buy/sell ticket, market history and advanced liquidity |
| `/portfolio` | Long options, writer receipts and LP positions |
| `/portfolio/[seriesId]` | Exercise, cancel, redeem and position history |
| `/activity` | Transactions and export, also reachable inside Portfolio |
| `/fund` | Optional USDC funding; manual instructions always available |
| `/settings` | Wallet/session information, reminders, display timezone |
| `/risk` | Product risks and contract authority map |
| `/status` | Network, indexer and integration availability |

Desktop: 224 px sidebar, 64 px top bar, workspace with 24–32 px gutters. Show the network and wallet in the top bar. Do not repeat a giant wallet balance on every screen. Mobile: four bottom tabs for Protect/Earn/Markets/Portfolio, with a compact top bar. Advanced LP controls use full-screen panels on phones. At 320 px, currency values wrap deliberately rather than hiding digits. A trade review drawer becomes a full-screen dialog on mobile.

Use the landing visual tokens. Tables use tabular digits, sticky contextual headings and a responsive card fallback. Prices always name the unit: `USDC/EURC` for strike or reference spot, `USDC/option` for premium. Do not label both simply “Price”. Display UTC deadlines plus optional local timezone beneath them; count down from observed chain time with a stale-clock indicator.

## 3. Global environment and data states

An immutable deployment manifest determines chain, token addresses, contract addresses and build mode. Show an always-visible Testnet badge when applicable. Wrong-network users can browse but cannot submit; offer a reviewed switch request. Wallet rejection is recoverable and not an application crash.

| State | Required behavior |
| --- | --- |
| Disconnected | Browse terms and examples; Connect wallet only when needed |
| Loading | Skeleton with units; no fabricated financial value |
| Empty | Explain no position/market exists and give the next useful action |
| No liquidity | Disable submission; show quantity adjustment and market alternatives |
| Quote stale | Preserve inputs, refresh quote, require a fresh review if amounts changed |
| RPC unavailable | Keep last-known values with time; disable new financial actions |
| Indexer behind | Show indexed block and delay; use direct RPC for critical current state |
| Market cutoff passed | Replace Buy/Sell with Exercise information; remove stale approvals CTA |
| New-risk pause | Disable mint/swap/add LP; keep permitted exit actions accessible |
| Restricted transfer / unknown outcome | Explain uncertainty; inspect hash and balances; do not blindly resubmit |
| Unsupported integration | Hide or disable the affected feature with a concrete reason |

A market data error is never displayed as zero. Distinguish an option with no sell quote from an option known to have expired. Never equate stale marks with executable liquidation value.

## 4. Protect flow

### 4.1 Screen layout

Desktop has a 7-column configuration pane and 5-column sticky review summary. Inputs in order: EURC exposure, available exercise window, strike, and selected quantity. Default to no recommendation until real markets load. A “Recommended” label requires an explicit disclosed rule; v1 simply sorts by date and strike.

Exposure input accepts up to four EURC decimal places because the contract's smallest deliverable is 0.0001 EURC. If a wallet balance includes finer precision, show the unprotected remainder; never silently round coverage upward. The input does not require the user currently to own EURC, but displays their delivery requirement prominently.

Market choice cards show strike, trading cutoff, complete exercise window, premium for the selected exposure and available buy size. A lower premium is not presented as universally better: strike and duration differ. On selection, fetch an **exact-output** quote for the option quantity. A budget preview may estimate quantity, but cannot silently replace the exposure-based order with an exact-input partial fill.

### 4.2 Review contents

Show: option quantity and EURC coverage; strike; USDC exercise amount; quoted premium; maximum USDC spend including slippage; estimated USDC gas; protocol/route fees if present; allowance spender; series vault; option token; pool; network; quote expiry; trading cutoff; exercise start/end. Advanced address details are expandable, while currencies and deadlines remain visible.

For the example, review says “Buy 100 options covering 10,000 EURC”, not “Deposit 10,000 EURC”. State: “To use these options, deliver 10,000 EURC during the exercise window. Exercise is manual.” If the user currently has insufficient EURC, allow purchase with this fact visible; require enough USDC for the premium limit plus gas reserve.

Approval precedes purchase when required. Default to the necessary amount or an explicitly chosen reusable limit, with spender and expiration shown. A generic unlimited approval is not the silent default. Quote refresh after approval is mandatory when the original quote expires.

### 4.3 Completion

Only a successful onchain receipt plus expected balance/event evidence can produce “Options purchased”. Show actual premium paid, actual quantity, transaction link and exercise window. Offer “View position” and optional reminders. Reminders require opt-in and a working provider; show configured/delivered status honestly. No confetti that obscures deadlines. A transaction sent but unconfirmed says “Submitted”, not “Protected”.

## 5. Earn flow

### 5.1 Explain the obligation before a deposit

Heading: **Write EURC options with USDC backing.** Supporting text: “Lock the full exercise amount, receive option tokens, and sell them for premium. If holders exercise, your writer receipt becomes a claim on a mix of USDC and EURC after expiry.”

The page has three stages: **Choose terms → Mint backed options → Sell options**. These are separate transactions in v1. Do not label the first transaction “Earn premium”. A combined mint-and-sell transaction is a later, separately reviewed feature and cannot be simulated with a success toast between unrelated wallet calls.

Input option quantity or desired USDC backing, with exact conversion and remainder. Show immutable series cap and remaining mint capacity. For 100 options at strike 1.10: backing 11,000 USDC, issuance fee separately displayed, USDC gas reserve additional. Display the market's current sell quote as indicative and expiring, never guaranteed for the later minted tokens.

### 5.2 Writer risk panel

Show two outcomes:

- No holders exercise: writer receipts claim the corresponding share of remaining USDC after the window ends.
- Holders exercise: writer receipts claim a pooled mix, potentially all EURC; value can fall below initial USDC backing.

Example: all 100 options sold for 200 USDC, all exercised, EURC reference value 1.00 → writer receives 10,000 EURC, worth 10,000 USDC at that reference, plus previously received 200 USDC premium. Compared with 11,000 USDC backing, the illustrative loss is 800 USDC before other costs. This panel is visible, not buried in Terms.

Receipts pool exercise outcomes within a series. They do not identify “your buyer”. Premium goes to the option seller at sale time and is not automatically distributed to all receipt holders. Transferred receipts may have unknown acquisition cost.

### 5.3 After minting

Success shows “Backed options minted”, option token balance, receipt balance and locked backing. Next CTA: “Review sale quote”. Sale uses **exact-input** option quantity and minimum USDC proceeds, with full input consumption enforced by the selected router. If no bid liquidity exists, show “Options minted; no executable sale quote”. Offer to hold, add LP through the advanced route, or cancel by burning equal quantities of option tokens and receipts before the cutoff. Cancellation does not refund the issuance fee or prior trading costs.

No fixed APY, automatic strategy, reinvestment toggle or “insured principal”. Initial fee defaults are configuration-driven; a zero-fee testnet must say zero, not fabricate a commercial take rate.

## 6. Markets and trading

Markets columns: pair, option type, strike, exercise window, time to trading cutoff, status, buy premium, sell premium, quote size, pool liquidity composition and actual volume period. Market filters: status, expiry and strike; currency fixed to EURC/USDC initially. Upcoming currencies are roadmap content outside the actionable table.

Market detail provides Terms, Trade, Liquidity, History and Contracts tabs. Trade defaults to Buy exact-output; Sell exact-input requires a token balance. Include full-fill limits, slippage and deadline. Show mid/reference mark only as an estimate separate from the executable ticket. Do not draw an option candle chart from underlying EURC prices. Sparse actual swaps may be shown as points or a table rather than invented candles.

The terms panel always includes physical delivery, quantity multiplier, contract addresses, immutable strike, trading cutoff and exercise interval. Registered pool identity includes ordered currencies, fee, tick spacing and hook. A pool for another expiry is not fungible with this option.

Before cutoff, a soft UI buffer may prevent starting a wallet flow too near expiry; the exact onchain cutoff remains authoritative. The UI buffer is disclosed and never extends contractual time. Once exercise begins, trading and LP additions on the registered pool stop; option transfers and LP removal remain possible. Other third-party pools are outside Pairband's lifecycle enforcement.

## 7. Portfolio and exercise

### 7.1 Separate holdings

Three tabs: **Options you own**, **Writer receipts**, **Liquidity positions**. Summary cards show asset quantities and provenance. Do not sum option notional and backing into portfolio value. Option mark-to-market may be unavailable; “Not available” is correct. Ownership transferred outside Pairband cannot inherit invented cost basis.

Long option rows show quantity, EURC deliverable, USDC received on exercise, remaining exercise time, and action. Before the window: Sell if liquidity exists; Exercise unavailable with exact start. During the window: Exercise. After the window: Expired, no redemption claim. Expired long tokens may remain visible in the wallet; hiding them in the UI does not burn or reimburse them.

### 7.2 Exercise screen

Review exact quantities: option tokens burned, EURC delivered, USDC received, estimated gas and remaining window. Show EURC balance and allowance. Reference spot may help assess the trade but is not required to calculate the contractual payout. If reference data is unavailable, label it unavailable and keep direct exercise functional. An out-of-the-money reference can show a caution and explicit user choice; it must not censor the contractual right.

The contract permits partial exercise in raw option units. Cap the request at wallet option balance and available EURC, using exact arithmetic. Insufficient USDC gas can prevent exercise despite enough EURC; show a gas funding route. Approval and exercise are separate where required. If expiry passes during approval, preserve the record and show that exercise is no longer permitted.

Success requires the exercised event and confirmed asset changes; display actual EURC in, USDC out and options burned. No backend keeper exercises user options in v1. Reminder delivery never proves exercise.

### 7.3 Writer receipt actions

Before cutoff, Cancel is enabled only for matched option and receipt amounts. During exercise, receipts are locked economically: no collateral withdrawal. After exerciseEnd, Redeem burns selected receipt units and sends the holder their pro rata share of USDC remaining and EURC delivered. The preview shows both assets and cumulative-allocation rounding. Another redemption can change this preview by at most 0.000001 of each token; terms and proportional entitlement remain fixed. It must not say “Withdraw original USDC” when exercise created EURC exposure.

Writer redemption has no expiry in v1. If the app/API disappears, users must be able to read and call verified contracts. Provide a documented recovery interface and ABI download. An administrator cannot seize unpaid claims or retroactively change strike/times. Stablecoin restrictions can still block transfers.

## 8. Advanced liquidity UI

Use verified Uniswap v4 PositionManager NFT positions. Show token0/token1 ordering internally but display option/USDC clearly. Inputs: range in USDC per whole option, desired token amounts, slippage limits and owner/recipient. Translate human prices to raw sorted pool prices with tested SDK math. Do not reuse an EURC spot range for the option token.

Display wallet LP NFT ownership, active liquidity, out-of-range status, accrued fees by currency, option inventory and USDC inventory. Adding liquidity requires separate tradeable capital. The series vault's locked backing is unavailable to this action.

At and after cutoff disable additions but keep decrease/collect operations available. During exercise: explain that option tokens inside LP inventory must first be removed, then exercised with EURC in another reviewed transaction. A combined helper is outside v1. Show the amount of option inventory at risk of expiry. Collecting USDC fees does not collect or exercise all option inventory. After expiry, option inventory may be worthless even while USDC and fees remain withdrawable.

No public managed vault deposits, auto-rebalancer permissions or projected fee APY in the initial product. The initial LP route can be restricted in the UI to advanced mode without falsely claiming the underlying pool is permissioned.

## 9. Wallet and transaction state machine

Use one shared transaction component across all flows:

`editing → validating → awaiting_approval_signature → approval_submitted → approval_confirmed → reviewing → awaiting_action_signature → submitted → confirmed`.

Branches: rejected, quote_expired, reverted, replaced, cancelled, unknown, network_changed. A replacement hash updates the same logical intent. An unknown receipt does not trigger a second economic action. Handle a wallet account change by invalidating the quote and request model. Never retain another wallet's private notification preferences in cache.

Gas display uses USDC. Native and ERC-20 USDC are two views of the same funds; never add them into a balance. Native gas estimates use 18 decimals; token spends use 6. Reserve the rounded-up token-equivalent gas cost before enabling Max. The estimate is not a promise of the final fee. [Arc USDC/EVM behavior](https://docs.arc.io/arc/references/evm-differences.md)

Use a chain receipt for inclusion/finality, with subsequent state reads for the action result. Provider/indexer disagreement is a data-quality issue; do not solve it by showing a made-up confirmation count. Testnet badges persist in wallet reviews, explorer links and exports.

## 10. Funding, data integrations and notification boundaries

Circle App Kit funding is optional and must not block the funded-wallet core flow. A bridge displays source-chain action, transfer status, Arc arrival and retry/recovery information. Bridging and buying the option are separate unless an actually supported, tested atomic destination workflow is added later. Unified Balance is not already-settled collateral. App Kit's documented Arc testnet swaps do not include new Pairband option tokens. [Support reference](https://docs.arc.io/app-kit/references/supported-blockchains)

The app uses Pairband RPC indexing for settlement-critical facts. An optional live Graph adapter may improve query distribution and analytics; label provider and indexed block. Its absence cannot disable exercise/redemption. No “AI risk score” or Graph sponsor badge without implemented functionality and qualifying live data.

Reminder controls: email opt-in, verified address, selected positions, reminder schedule and best-effort warning. Never send reminders to an unverified arbitrary address submitted by another person. The build prompt prepares provider integration; actual sending requires a configured provider, consent and authorized operation.

## 11. Data and component contract

Use generated shared types for `SeriesTerms`, `SeriesState`, `ExecutableQuote`, `WalletPosition`, `LpPosition`, `TxIntent`, `IndexedEvent`, `ReferenceMark` and `IntegrationStatus`. Integer amounts cross HTTP as decimal strings, never JSON numbers. Every financial response carries chainId, blockNumber, blockHash and observedAt where applicable. Quotes include expiresAt, amount limits, spender, recipient, target, calldata and value.

Core components: `AppShell`, `NetworkBadge`, `WalletMenu`, `AmountInput`, `AssetValue`, `SeriesSelector`, `StrikeCard`, `ExerciseWindow`, `QuoteSummary`, `ApprovalStep`, `TransactionReview`, `TransactionProgress`, `RiskNotice`, `PayoffChart`, `PositionsTable`, `ExerciseTicket`, `WriterRedemption`, `LpInventory`, `DataFreshness` and `EmptyState`.

Each component needs loading, missing-data, invalid-input, disabled, focus, success and failure variants where relevant. Financial UI text must come from an explicit message catalog for future localization; do not derive currency labels by truncating symbols. Human addresses show checksum/copy/explorer controls, and contract destinations must match the manifest.

## 12. Acceptance matrix

| Flow | Evidence required |
| --- | --- |
| Buy | Exact option quantity arrives; actual spend within maximum; receipt and UI agree |
| Mint | Exact backing reserved; option and writer receipt quantities match; fee separate |
| Sell | Full requested input consumed or revert; USDC proceeds satisfy minimum |
| Cancel | Matched claims burned before cutoff; backing returned; no fee refund invented |
| Exercise | Correct window, EURC in, USDC out, options burned; no reference feed required |
| Redeem | Correct mixed-asset share, receipt burned, repeated call cannot claim twice |
| LP | Actual NFT owner; additions stop; withdrawals survive cutoff and new-risk pause |
| Expiry | Boundary changes all screens consistently; no automatic exercise claim |
| Failure | Rejection, stale quote, missing receipt and provider outage are recoverable |
| Accessibility | Complete keyboard journey, labels/errors announced, charts have tables |

Playwright must cover desktop and phone core journeys against a deterministic local chain and real contract calls. Arc-specific behavior needs separate Arc RPC integration evidence; a local Anvil test cannot reproduce every Arc runtime rule. Record screenshots at 390, 768 and 1440 px and evidence for slow RPC, zero liquidity, partially exercised writer reserves and expired LP option inventory. This document specifies tests to implement; it does not claim they already pass.

Build stages O18–O23 implement these flows; O26 verifies the integrated experience. The technical specification is authoritative for arithmetic and contract permissions.


---
