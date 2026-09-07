
# Pairband — landing page specification

Version 2.0 · 7 September 2026 · Product direction: collateralized FX options

This is the active marketing specification. It supersedes the payment-platform, authenticated-flow-pricing and spot-AMM positioning in earlier Pairband materials. It describes a proposed product; it does not certify that contracts, liquidity, an audit, customers or a mainnet deployment exist.

## 1. What the page must communicate

**Pairband lets people buy and sell stablecoin FX options on Arc.** Its first market is an EURC put backed by USDC. A buyer pays a premium for the right to deliver EURC for a fixed amount of USDC during a stated exercise window. A writer supplies the USDC backing and can sell the option for premium. Uniswap v4 pools provide secondary trading of option tokens against USDC.

The visitor should understand the asset, the premium, the exercise deadline and who bears the risk before seeing a wallet connection request. “Earn” means selling options and accepting their downside; minting an option by itself earns nothing. There is no promised APY. “Protect” describes a contractual USDC exchange right, contingent on timely exercise and token delivery, not insurance or a guarantee of fiat value.

The initial audience is crypto-native EURC holders with a dated USDC need, experienced USDC option writers, and specialist liquidity providers. Payment platforms and corporate treasury teams are potential later distribution customers. Do not imply signed enterprise customers or a demonstrated market for the product.

## 2. Information architecture and launch modes

Use `pairband.com` for the public site and, after a separate deployment decision, `app.pairband.com` for the app. Links must be environment-driven until those hosts actually serve the product. Local development must work without DNS changes.

Navigation: logo, How it works, Markets, Risks, Docs, and one primary launch button. On mobile use a compact menu and one visible primary button. The logo can be the existing approved wordmark if available; otherwise use a restrained text wordmark until brand assets are approved.

| Mode | Banner | Primary CTA | Market data |
| --- | --- | --- | --- |
| Preview | Product preview | Join early access | Explicitly illustrative, no trade button |
| Testnet | Arc Testnet · Test tokens only | Try the testnet app | Actual testnet series and receipts |
| Mainnet pilot | Limited mainnet pilot | Open app | Verified production deployment only |

Never switch to mainnet from a calendar date alone. The deployment manifest and release gates determine mode. A preview screenshot cannot be presented as a live trade. The default build mode is preview until testnet evidence exists.

## 3. Page sequence and approved copy

### 3.1 Header and hero

Eyebrow: **Stablecoin FX options on Arc**

Headline: **Set your EURC exit rate. Keep your upside.**

Supporting copy: **Buy the right to exchange EURC for USDC at a fixed rate during a chosen exercise window. Pay an upfront premium, or supply USDC backing and sell options to earn premium.**

Primary CTA follows the mode table. Secondary CTA: **See how it works**, scrolling to the explainer. Below the buttons: **Starts with EURC/USDC · Fully collateralized contracts · Options traded through Uniswap v4**. “Fully collateralized” links to a short explanation of reserved USDC, issuer risks and contract risks. In preview mode precede the technology line with “Designed for”.

Hero layout: on a 1440 px screen, a 1200 px container, five columns of copy and seven of product visualization. Heading maximum width about 520 px. The right side is a readable option ticket and payoff chart, not decorative trading terminals or fabricated charts. Use real HTML and SVG for numbers and charts.

Illustrative ticket:

- Exposure: 10,000 EURC.
- Strike: 1.10 USDC per EURC.
- Option quantity: 100 options; one option covers 100 EURC.
- Premium: 200 USDC, illustrative; excludes gas and any separately disclosed fees.
- Exercise: a clearly labeled example window, not an implied available listing.
- Conditional exchange: deliver 10,000 EURC; receive 11,000 USDC.

Label the complete ticket “Illustrative example”. Below it: “Exercise requires EURC delivery before the window closes. Premium is paid upfront and can be lost.” An actual listing must instead show its exact UTC start and end and the live executable premium for the selected size.

### 3.2 Three ways to use Pairband

Three equal cards, each with a different verb and destination:

| Card | Copy | CTA |
| --- | --- | --- |
| Protect | Hold EURC and buy an option that gives you a fixed USDC exchange rate during its exercise window. | Explore protection |
| Earn | Lock USDC to write options. Receive premium when they sell, and accept EURC if holders exercise. | Understand writing |
| Trade | Buy or sell listed option tokens through Uniswap v4 before trading closes. | Explore markets |

Under Earn, visible text: “Your returned assets can be worth less than your original deposit.” LPs are explained separately below; do not combine writers and AMM LPs under a single deposit box.

### 3.3 Explain the actual lifecycle

Use a four-step sequence with enough room for a sentence each:

1. **Choose a series.** Select an available strike and exercise window for EURC/USDC.
2. **Pay the premium.** Buy option tokens with USDC. Your EURC remains in your wallet until you choose to exercise.
3. **Decide during the window.** Deliver the required EURC to receive the fixed USDC amount, or let the option expire. Secondary trading on the registered Pairband pool closes when exercise begins.
4. **Close the position.** Used options are burned. Unused options expire. Writers claim their share of the remaining USDC and any EURC delivered after the window ends.

Beside the sequence provide a mini glossary: strike = USDC received per EURC on exercise; premium = option purchase price; exercise = using the exchange right; expiry = final exercise deadline. Avoid “automatic settlement” and “always protected”.

### 3.4 Interactive payoff explainer

Inputs: exposure in EURC, strike in USDC/EURC, total premium in USDC, hypothetical EURC market price at the exercise decision. Default to the hero example. Inputs are educational values, not executable quotes; an “Illustrative” badge stays visible when changed. Optional fees and gas can be shown as a separate total cost input.

For exposure `N`, strike `K`, spot `S`, premium `P` and additional costs `C`, plot:

- Unprotected holding: `N × S`.
- Holding plus correctly exercised option: `N × max(S, K) − P − C`.
- Option alone: `N × max(K − S, 0) − P − C`.

The chart describes rational exercise at the selected time inside the window. It is not a final-price oracle or an automatic payout. If exercise is missed, the option component is zero and the premium remains spent. Provide a “Missed exercise” toggle with that outcome.

| Hypothetical price | Unprotected EURC value | Holding plus option, after 200 USDC premium |
| --- | ---: | ---: |
| 1.00 USDC/EURC | 10,000 USDC | 10,800 USDC |
| 1.10 USDC/EURC | 11,000 USDC | 10,800 USDC |
| 1.20 USDC/EURC | 12,000 USDC | 11,800 USDC |

Below the table: “Assumes sufficient EURC, timely exercise when useful, and stablecoin values as shown. Excludes gas, slippage and additional fees.” Label axes with currencies and separate the standalone option payoff from the protected holding. Do not label 10,800 USDC a guaranteed dollar balance.

Accessibility: keyboard-operable inputs and slider, textual outcome summary, a table equivalent to the chart, no color-only distinction, and reduced-motion support. Financial calculations must share the app's decimal-safe payoff package; SVG pixels may use floating point only after authoritative values are calculated.

### 3.5 Markets preview

Show at most three series to keep attention on usable liquidity. Columns: pair, strike, trading closes, exercise window, buy premium for a declared quantity, sell quote availability, market status. A displayed premium is for a specific size and direction, with quote time and expiry. Do not use pool midpoint as a guaranteed executable premium.

Preview mode may display fixture cards with a persistent “Example” marker and a link to the explainer. Testnet uses actual indexed series plus fresh RPC state. Missing liquidity displays “No executable quote”; a provider failure displays “Quotes unavailable”. Neither becomes 0 USDC. Expired series never keep a Buy CTA.

### 3.6 Writing and providing liquidity

Heading: **Two different ways to supply capital.**

Writer panel: “Back EURC puts with USDC. Minting locks the full exercise amount and creates an option token plus a writer receipt. Selling the option earns premium. After expiry, the receipt claims your share of USDC and any EURC received from exercises.” Show 11,000 USDC backing and the possible 10,000 EURC return in the example. Premium stays with whoever sold the option; transferring a receipt does not transfer historical premium.

Liquidity panel: “Supply option tokens and USDC to a Uniswap v4 pool. Earn trading fees while accepting changes in the value and composition of your position.” Show that LP capital is separate from writer collateral. Explain that option tokens held inside an LP position must be withdrawn before they can be exercised, and expire if unused. Fee collection alone is not exercising.

Avoid projected APY in both panels. If later displaying historical results, include period, sample size, realized losses, costs and provenance; suppress annualization of a brief testnet sample.

### 3.7 Why Arc and Uniswap

Use two concise panels with links, not an unsupported partner-logo wall. Proposed copy: “Arc provides USDC-denominated transaction fees and stablecoin settlement. Uniswap v4 provides option-token markets, with a Pairband hook that enforces each market's trading lifecycle.” Arc has explicitly discussed structured products and LP strategies using its Uniswap infrastructure; that supports the product thesis, not a grant or endorsement. [Arc's Uniswap overview](https://www.arc.io/blog/how-uniswap-brings-deep-liquidity-for-apps-on-arc)

The hook does not supply collateral, calculate fair option value, guarantee liquidity or cause the official Uniswap app to route to the pool. Hooks do not automatically receive Uniswap frontend distribution. [Uniswap hooks](https://developers.uniswap.org/docs/protocols/v4/concepts/hooks)

Circle App Kit may provide optional USDC funding. Do not show “Swap any option with App Kit”: the currently documented Arc testnet swap assets exclude Pairband option tokens. [App Kit support](https://docs.arc.io/app-kit/references/supported-blockchains)

### 3.8 Risk and transparency section

Five readable items: option expiry and manual exercise; writer loss and EURC exposure; liquidity/quote risk; smart-contract and network availability; stablecoin issuer, transfer restriction and depeg risk. Link the detailed risk page and actual contract addresses when available. “Unaudited testnet” must be explicit before testnet transactions. An audit badge appears only with a real report, scope and matching commit.

Show collateral amounts by series only when the data can be reconciled. Never add collateral, option notional and AMM liquidity into one TVL number. No fake testimonials, partner commitments, user counts, volume, awards, audit reports or launch countdowns.

### 3.9 FAQ — answer text

**Is this a swap?** Buying an option buys a future exchange right. Exercising uses it. Trading the option on Uniswap is a separate transaction.

**Do I deposit EURC when buying?** No. You need USDC for premium and gas. You must deliver the required EURC if you exercise later.

**What happens if EURC rises?** You can keep the EURC and leave the option unused. The premium remains a cost.

**What if I miss the exercise window?** The option expires and cannot be used. Reminders are best-effort and do not exercise for you.

**Is writer yield guaranteed?** No. Options may not sell. Exercised options exchange your USDC backing for EURC that can be worth less. Writing and providing AMM liquidity are different activities.

**Can I sell early?** You may sell before the Pairband market cutoff if there is sufficient liquidity. A sale is not guaranteed and may realize a loss.

**Does fully collateralized mean safe?** It means the contract reserves the specified USDC exercise amount. It does not remove code, issuer, depeg, transfer, liquidity or expiry risks.

**Is Pairband live on mainnet?** Render the answer from verified deployment status. Until release gates pass: “Pairband is in development/testnet. Mainnet access will depend on security, market and deployment readiness.”

### 3.10 Early access and footer

Form fields: email required; role required (`eurc_holder`, `option_writer`, `market_maker`, `integrator`, `researcher`); intended use optional up to 500 characters; expected EURC exposure band optional; privacy acknowledgment required; separate optional product-update consent. No wallet required. Store submission server-side with a random request ID, consent version and time. Deduplicate email internally without revealing whether an address already exists. Return the same success text: “Your request has been received.” Handle retries, rate limits and validation without losing typed fields. Transactional verification or emails require a configured provider and explicit user consent; never mark sent without provider evidence.

Footer: Docs, Risks, Terms, Privacy, GitHub, network status, contact. Unavailable destinations remain hidden until real content or URLs exist. Terms/privacy drafts must not be mislabeled as legal approval. Do not publish a copied generic derivatives policy.

## 4. Visual system

| Token | Value / behavior |
| --- | --- |
| Canvas / surface | `#F6F5F0` / `#FFFFFF` |
| Primary text / muted | `#102E33` / `#52666A` |
| Action / EURC accent | `#087F75` / `#4267C8` |
| Soft highlight / border | `#C9E8DD` / `#D7DFDA` |
| Warning / critical | `#8A5700` / `#B42318` |
| Fonts | Manrope headings; Inter UI; IBM Plex Mono for IDs; self-host licensed font files |
| Spacing | 4 px base; 8/12/16/24/32/48/64/96 px scale |
| Radius | 12 px fields; 20 px primary cards; 999 px compact badges |
| Type | Desktop hero 56–64 px; mobile 36–40 px; body 16–18 px; financial values tabular |

Use a quiet financial-product aesthetic: strong type, precise figures, clear dividers, generous space. Avoid glassy neon dashboards, fake terminal output, oversized glow effects and decorative chains. If paired-band artwork is added, keep it secondary to the ticket. Prefer light mode first; dark mode is optional after contrast testing.

Desktop 1200 px content, tablet 8-column, phone single-column with 20 px gutters. Hero ticket follows copy on mobile. No horizontal overflow at 320 px. Charts must remain legible at 200% text zoom. Focus, error and selected states must be designed, not left to color changes alone.

## 5. Frontend implementation and acceptance

Proposed components: `PublicHeader`, `LaunchModeBanner`, `HeroOptionTicket`, `UseCaseCards`, `LifecycleSteps`, `PayoffExplorer`, `MarketPreview`, `CapitalRoles`, `TechnologySection`, `RiskSummary`, `Faq`, `EarlyAccessForm`, `PublicFooter`. Reuse domain formatters and tokens with the app, but do not load wallet SDKs or chart bundles on first paint unnecessarily.

SEO: accurate title and description; canonical URL per deployment; preview/testnet environments use appropriate indexing policy; sitemap only for actual public pages; Open Graph image contains no invented metrics. Use Organization/SoftwareApplication structured data only for factual fields. No Review/AggregateRating fabrication. Cache public content, never authenticated wallet responses.

Analytics events: `landing_view`, `explainer_change`, `protect_cta`, `earn_cta`, `market_open`, `early_access_submit_success`. Do not send email, balances or wallet addresses to general analytics. Consent requirements are part of the jurisdiction review. Public performance targets: mobile LCP under 2.5 s and CLS under 0.1 in a documented test profile; these are targets, not measured results.

Accept when the three user roles are understandable without jargon; every CTA reaches a working destination; illustrative and actual data cannot be confused; example arithmetic matches shared fixtures; no zero-premium error fallbacks exist; mobile and keyboard flows work; early access persists real requests; and screenshots at 390, 768 and 1440 px show no clipped values. Tests should target these outcomes, not snapshots of arbitrary spacing.

Build with stages O16–O17 of the prompt kit, using the protocol and app documents for all financial claims. The complete staged kit also contains migration instructions for older Pairband code.


---
