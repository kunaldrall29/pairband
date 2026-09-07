
# Persistence and event contract

PostgreSQL proposal. All chain-sized integers use numeric(78,0) with nonnegative checks unless a field explicitly represents a signed delta. Monetary calculations remain in the domain package/SQL exact arithmetic. Addresses normalize for keys; display checksum separately. UTC timestamptz for service times; chain timestamps remain integer seconds. Every migration is reversible where data safety permits; never silently drop user/chain history.

| Table | Principal fields / integrity |
| --- | --- |
| deployments | chain_id, environment, manifest_hash, git_commit, verification_status; unique environment+manifest_hash |
| series | chain_id+series_id PK; vault/long/receipt unique per chain; immutable terms; creation tx/block; validate A,C,times against source |
| pools | chain_id+pool_id PK; series FK, ordered currencies, fee,tick_spacing,hook,manager; exact one registered pool per series |
| indexed_blocks | chain_id+block_number PK; block_hash,parent_hash,timestamp; provider and ingest time |
| indexed_events | chain_id,block_hash,tx_hash,log_index unique; emitter,topic,payload,block_number; decoded schema version |
| series_accounting | series FK; writer_units,exercised_units,redeemed_units,accounted_usdc6,accounted_eurc6,snapshot fields; as_of_block/hash; derived cache |
| token_balances | chain_id,token,holder unique; raw_amount; block/hash; reconcile against RPC |
| lp_positions | chain_id,position_manager,token_id unique; owner,pool_id,ticks,liquidity; raw inventory/fees and block |
| trade_fills | event FK unique; pool/series,side,option_units,usdc6,account where attributable; provenance; no made-up owner from arbitrary router sender |
| transaction_intents | account,client_intent_id unique; action,series,known hashes,status; immutable request digest |
| quotes | quote_id PK; account,series,side,quantity,limits,block,expires_at,route_hash; short retention; never execution ledger |
| reference_marks | pair,source,observed_at unique; decimal price string,units,stale flag,method; never collateral source |
| auth_nonces | nonce_hash unique; address,domain,chain,created/expires/used; consume transactionally |
| sessions | token_hash PK; address,created/expires/revoked; minimal metadata; secure cookie opaque token |
| notification_preferences | account+series+channel unique; verified destination reference,consent_version,status,schedule |
| verified_emails | account+normalized_email; verification status and hashed expiring challenge; restricted access |
| outbox_jobs | job_id; dedupe_key unique; kind,payload_reference,status,attempts,lease_until,next_run; no plaintext wallet secrets |
| early_access_requests | normalized_email unique; role,use,band,privacy_version,consent flags/timestamps,request_id; private access |

Protocol event ABI proposals (actual signatures must be compiled/generated and frozen): SeriesCreated(id,vault,long,receipt,terms); PoolRegistered(id,poolId,key); NewRiskPauseChanged(id,paused); OptionsMinted(id,account,units,collateral6,fee6); OptionsCancelled(id,account,units,returnedUSDC6); OptionsExercised(id,account,units,eurcIn6,usdcOut6); SeriesFinalized(id,writerUnits,usdc6,eurc6); WriterRedeemed(id,account,units,usdcOut6,eurcOut6). ERC20 Transfer maintains holdings, while these events describe financial actions. Avoid encoding unconstrained dynamic structs in indexing assumptions before the ABI exists.

Uniswap events are decoded from the pinned core/periphery ABI. A PoolManager Swap caller may be the router, not the end user; correlate PairbandRouter's own event or transaction context without claiming all external routes are attributable. Add RouterTrade(id,account,side,units,usdc6) after checked successful execution. LP ownership comes from verified NFT ownership, not wallet-submitted metadata.

Index event keys and block range, series+phase/expiry queries, holder+token, job readiness/lease, session lookup/expiry. Use transactional event insert+projection+checkpoint. Ignore duplicate events by exact key; detect different hashes at a checkpoint and require reconciliation rather than mixing states. Testnet reset creates an explicit new deployment/indexing generation. Retain canonical history and rebuild projections safely.

Outbox dispatch claims jobs with SKIP LOCKED and expiring leases; mark delivered only with provider result. Retry bounded and idempotent. Dead-letter records support operator diagnosis. Notification email and early-access PII have explicit retention/deletion policies and are excluded from public exports. CSV exports escape formula-leading characters and identify chain, timezone and data freshness; never present them as tax advice.


---
