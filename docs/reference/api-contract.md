
# API contract — v1 proposal

Base `/v1`; JSON; generated shared runtime schemas; amounts are decimal integer strings. Addresses are validated then compared using canonical casing. Wallet-specific responses use private/no-store caching. No endpoint receives a private key, signs a user action or claims settlement from request acceptance. Apply request size limits, rate limits and structured errors. An authenticated session never substitutes for onchain token ownership.

## Common types

`Provenance={chainId:number,blockNumber:string,blockHash:hex,observedAt:ISO8601,source:"rpc"|"indexer"|"graph"|"fixture",stale:boolean}`. A fixture response requires preview mode and cannot prepare a real transaction. Indexed responses add `indexedThroughBlock`; a reference mark uses source URL/provider, observation time and freshness separately.

`SeriesTerms={seriesId:bytes32,vault:address,longToken:address,writerReceipt:address,underlying:address,settlement:address,optionDecimals:6,receiptDecimals:6,underlyingPerUnit6:"100",strikePerUnit6:integerString,tradingStart:integerString,exerciseStart:integerString,exerciseEnd:integerString,maxWriterUnits:integerString,issuanceFeeBps:number,feeRecipient:address,poolId:bytes32|null}`. Status is derived from chain time; it is not mutable economic storage in SQL.

`UnsignedTransaction={chainId:number,from:address,to:address,data:hex,value:"0",gasEstimateNative18:integerString,maxFeePerGasNative18:integerString,deadline:integerString|null}`. Manifest target allowlists and decoded semantic assertions validate it in API and client. The current narrow router has implicit recipient=caller. Approval transactions expose spender/token/amount separately.

## Read endpoints

- `GET /health` liveness; no credentials or internal connection strings.
- `GET /ready` readiness with named degraded dependencies. Optional Graph/email unavailability must not mark settlement core unavailable.
- `GET /deployment` safe public manifest including mode, chain and verified addresses, commit and feature status.
- `GET /series?phase=trading&cursor=...&limit=20` bounded public list; cursor opaque, limit1..100.
- `GET /series/:id` terms, direct phase snapshot, accounted reserves, capacity, registered pool and provenance;404 unknown.
- `GET /wallets/:address/positions` long/receipt balances and corresponding series, cost basis known/unknown. Public chain holdings require no session.
- `GET /wallets/:address/liquidity` verified PositionManager NFT positions with ownership, token inventory, fees and block.
- `GET /activity?wallet=...&seriesId=...&cursor=...` actual events; no synthetic execution from quote records.
- `GET /reference-marks?pair=EURC_USDC` informational price, units, source, timestamp, stale reason; unavailable is a typed state, not0.

## Executable quote

`POST /quotes` body `{seriesId,side:"buy"|"sell",optionUnits,account,slippageBps}`. Require positive units within cap and supported slippage policy; default50 bps for demo is a UI proposal, not a market guarantee. Buy is EXACT_OUTPUT options; sell is EXACT_INPUT options. Return quoteId, poolId, terms hash, side, optionUnits, expectedUSDC6, maxUSDC6 for buy or minUSDC6 for sell, poolFeeIncluded:true, protocolIssuanceFee6:"0" for a pure swap, quoteBlock/provenance, expiresAt, tradingCutoff, spender, allowanceNeeded, unsigned transaction, simulation result and warning codes. Include route identity. Fee-on-mint is not charged again on secondary trading.

Quote maximum lifetime proposed30 seconds, bounded to before exerciseStart; wallet flow may use a conservative additional UI cutoff. A refresh invalidates the old review if limits change. No route returns422 `NO_LIQUIDITY`; inactive series409 `PHASE_NOT_TRADING`; stale dependency503; invalid amount400. Never return an empty successful transaction.

## Action preparation

`POST /actions/prepare` body `{action:"mint"|"cancel"|"exercise"|"redeem"|"lp_add"|"lp_decrease"|"lp_collect",seriesId,account,units?,positionId?,lpParameters?}`. Use a discriminated union; reject irrelevant fields. Read phase, balances, allowances, registry pause and NFT ownership from RPC. Return exact input/output preview, fee6, required approvals, unsigned transaction, state block, warnings and simulation status. Build from generated ABIs and pinned periphery, not arbitrary client calldata. For mint/cancel/exercise/redeem, units is required and positionId/lpParameters are forbidden. LP add requires tickLower, tickUpper, amount0Desired, amount1Desired, amount0Min, amount1Min and deadline; LP decrease requires positionId, liquidityDelta, amount0Min, amount1Min and deadline; LP collect requires positionId and deadline. Asset amounts/liquidity are integer strings, ticks are bounded integers, and ownership/recipient derives from the requesting account. These are app request fields: map them to the actual pinned PositionManager interface during implementation rather than inventing a matching contract method. No hidden LP add during mint. For redemption show both asset outputs and the cumulative-allocation rounding rule. For exercise, do not require an informational reference mark.

`POST /transaction-intents` body `{clientIntentId,account,chainId,action,seriesId,transactionHash}` registers monitoring only; verify shape/target once visible onchain. Idempotency key is scoped to account/action and exact body. Return202 monitoring, never201 settled. A hash for another sender/action is rejected or marked mismatch. Replacement hashes link to the same intent. Public monitoring does not reveal private preference/session data.

## Authentication and private preferences

`POST /auth/nonce` accepts intended address/chain; creates one-time bounded nonce. `POST /auth/verify` verifies canonical sign-in domain, URI, nonce, chain, expiry and signature including supported contract-wallet verification; issues secure HttpOnly SameSite cookie. Bind session to nonce address and origin; expire/revoke; replay409. `POST /auth/logout` invalidates session. Rate-limit challenge generation and signature work.

`GET/PUT /me/reminders` require session and CSRF protections. Fields: seriesId, enabled, channels:["email"], email, scheduleCodes, consentVersion. Changes require verified ownership and email verification before dispatch. Store pending verification distinctly. `POST /me/email/verify` consumes one-use hashed token, bounded expiry, no token logging. Sending providers remain disabled without configuration and authorized operation.

`POST /early-access` body `{email,role,intendedUse?,exposureBand?,privacyAcknowledged:true,privacyVersion,productUpdatesOptIn:boolean,clientRequestId}`. Role enum as landing spec; intendedUse max500characters. Normalize email conservatively, enforce syntax/size, deduplicate privately. Return the same202 `{status:"received"}` for new/repeated valid requests to avoid address enumeration. Do not claim a confirmation email was sent unless verified. Rate limit, honeypot/abuse controls and deletion policy required.

## Error and observability schema

`{error:{code,message,requestId,retryable,details?}}`; never return stack traces, private keys, raw signatures or provider credentials. Common codes include WRONG_CHAIN, INVALID_AMOUNT, PHASE_NOT_TRADING, EXERCISE_NOT_OPEN, EXPIRED, INSUFFICIENT_BALANCE, INSUFFICIENT_GAS, NO_LIQUIDITY, SLIPPAGE_LIMIT, NEW_RISK_PAUSED, QUOTE_EXPIRED, TRANSFER_RESTRICTED, OUTCOME_UNKNOWN, PROVIDER_UNAVAILABLE and CONFIG_UNVERIFIED. Unknown receipt and confirmed revert are different states. Measure latency/error/quote fill evidence without putting user balances or email in generic analytics.

Generate OpenAPI3.1 from these runtime schemas during O13; no hand-maintained second schema that can drift. Add request examples, negative examples, pagination and error schemas to the generated artifact. HTTP preparation idempotency does not guarantee financial idempotency after a wallet submits a different nonce.


---
