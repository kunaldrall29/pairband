# O10 — Multicall3From / CallFrom notes

Source: [docs.arc.io contract-addresses](https://docs.arc.io/arc/references/contract-addresses), batched-transactions, compliance.

## Addresses (testnet)

- Multicall3From: `0x522fAf9A91c41c443c66765030741e4AaCe147D0` — bytecode present (O10 preflight)
- Multicall3 (reads): `0xcA11bde05977b3631167028862bE2a173976CA11`
- Memo: `0x5294E9927c3306DcBaDb03fe70b92e01cCede505`
- CallFrom precompile: `0x1800…0003` (protocol)

## Product impact

- PairbandRouter unlock context uses entry `msg.sender` as payer/recipient.
- When users batch via Multicall3From, Arc preserves EOA as `msg.sender` in subcalls — **good** for router correctness vs vanilla Multicall3.
- Indexers (O12) must attribute activity to original EOA for Multicall3From/Memo routes, not only the batch contract address.
- Blocklist monitoring must include Multicall3From/Memo as routing contracts.
- `aggregate3Value` is unsupported (CallFrom does not forward value) — PairbandRouter already rejects `msg.value`.

## Evidence gap

Live PairbandRouter-through-Multicall3From receipt: **blocked** until contracts are deployed and an authorized test tx is sent. Do not fabricate.
