
# Pairband complete build-prompt kit — options v2

Start with [START_HERE.md](START_HERE.md). Separate design specs are [landing](reference/landing.md) and [app](reference/app-ui.md). The [protocol specification](reference/protocol.md) freezes the economics.

## Stages

| Stage | Build task | Prerequisites | Optional |
| --- | --- | --- | --- |
| O00 | [Repository bootstrap and migration](prompts/O00-repository-bootstrap-and-migration.md) | — | No |
| O01 | [Dependency, Arc and Uniswap compatibility preflight](prompts/O01-dependency-arc-and-uniswap-compatibility-preflight.md) | O00 | No |
| O02 | [Integer domain model, phases and payoff mathematics](prompts/O02-integer-domain-model-phases-and-payoff-mathematics.md) | O00, O01 | No |
| O03 | [Series factory, immutable terms and claim tokens](prompts/O03-series-factory-immutable-terms-and-claim-tokens.md) | O02 | No |
| O04 | [Collateral minting and matched cancellation](prompts/O04-collateral-minting-and-matched-cancellation.md) | O03 | No |
| O05 | [Physical exercise and matured writer claims](prompts/O05-physical-exercise-and-matured-writer-claims.md) | O04 | No |
| O06 | [Uniswap v4 series lifecycle hook and market registration](prompts/O06-uniswap-v4-series-lifecycle-hook-and-market-registration.md) | O01, O03, O05 | No |
| O07 | [Narrow swap router, quotes and full-fill guarantees](prompts/O07-narrow-swap-router-quotes-and-full-fill-guarantees.md) | O02, O06 | No |
| O08 | [LP PositionManager integration and expiry exits](prompts/O08-lp-positionmanager-integration-and-expiry-exits.md) | O07 | No |
| O09 | [Adversarial contract and economic invariant suite](prompts/O09-adversarial-contract-and-economic-invariant-suite.md) | O05, O06, O07, O08 | No |
| O10 | [Arc testnet deployment and real lifecycle evidence](prompts/O10-arc-testnet-deployment-and-real-lifecycle-evidence.md) | O09 | No |
| O11 | [Database, API foundation and private preferences](prompts/O11-database-api-foundation-and-private-preferences.md) | O00, O02 | No |
| O12 | [Canonical RPC indexer and reserve reconciliation](prompts/O12-canonical-rpc-indexer-and-reserve-reconciliation.md) | O05, O06, O08, O11 | No |
| O13 | [Quote and unsigned transaction API](prompts/O13-quote-and-unsigned-transaction-api.md) | O07, O11, O12 | No |
| O14 | [Payoff analytics, reference marks and honest portfolio values](prompts/O14-payoff-analytics-reference-marks-and-honest-portfolio-values.md) | O02, O12 | No |
| O15 | [Durable workers and exercise reminders](prompts/O15-durable-workers-and-exercise-reminders.md) | O11, O12 | No |
| O16 | [Shared design system, app shell and wallet states](prompts/O16-shared-design-system-app-shell-and-wallet-states.md) | O00, O02 | No |
| O17 | [Updated landing page with real early access](prompts/O17-updated-landing-page-with-real-early-access.md) | O11, O14, O16 | No |
| O18 | [Protect purchase flow](prompts/O18-protect-purchase-flow.md) | O13, O16 | No |
| O19 | [Earn mint-and-sell writer journey](prompts/O19-earn-mint-and-sell-writer-journey.md) | O04, O18 | No |
| O20 | [Markets, option trading and terms](prompts/O20-markets-option-trading-and-terms.md) | O14, O18 | No |
| O21 | [Portfolio, exercise, cancellation and writer redemption](prompts/O21-portfolio-exercise-cancellation-and-writer-redemption.md) | O05, O15, O18 | No |
| O22 | [Advanced LP interface and expiring inventory](prompts/O22-advanced-lp-interface-and-expiring-inventory.md) | O08, O20, O21 | No |
| O23 | [Activity, exports and financial observability](prompts/O23-activity-exports-and-financial-observability.md) | O12, O16, O21 | No |
| O24 | [Optional Circle funding and user-controlled onboarding](prompts/O24-optional-circle-funding-and-user-controlled-onboarding.md) | O01, O18 | Yes |
| O25 | [Optional live Graph data and qualifying analytics](prompts/O25-optional-live-graph-data-and-qualifying-analytics.md) | O01, O12 | Yes |
| O26 | [Integrated end-to-end and accessibility verification](prompts/O26-integrated-end-to-end-and-accessibility-verification.md) | O10, O17, O19, O20, O21, O22, O23 | No |
| O27 | [Liquidity, pricing and product economics validation](prompts/O27-liquidity-pricing-and-product-economics-validation.md) | O09, O14, O26 | No |
| O28 | [Independent review preparation and funded-pilot gates](prompts/O28-independent-review-preparation-and-funded-pilot-gates.md) | O09, O26, O27 | No |
| O29 | [Deployment, monitoring, backups and conditional mainnet release](prompts/O29-deployment-monitoring-backups-and-conditional-mainnet-release.md) | O28 | No |
| O30 | [ETHGlobal documentation and product demonstration](prompts/O30-ethglobal-documentation-and-product-demonstration.md) | O10, O17, O19, O20, O21, O23, O26 | No |
| O31 | [Company, pilot distribution and investor/grant materials](prompts/O31-company-pilot-distribution-and-investor-grant-materials.md) | O27 | No |
| O32 | [Optional future-product expansion design](prompts/O32-optional-future-product-expansion-design.md) | O28, O31 | Yes |

There are 33 staged prompts, 3 reusable maintenance/review prompts and 3 tool kickoff guides. All financial examples are labeled fixtures. Templates have no credentials or verified mainnet addresses. See SOURCES.md for current evidence and limits.


---
