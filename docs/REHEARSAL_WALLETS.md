# Rehearsal wallets (Arc testnet)

Use these addresses to fund and run end-to-end pay rehearsals on **Arc testnet** (chain ID `5042002`).

## Fund via Circle faucet

1. Connect the **payer** wallet in MetaMask (or import the dev key locally — never commit private keys).
2. Add Arc testnet: RPC `https://rpc.testnet.arc.io`, chain ID `5042002`.
3. Open the [Circle Arc testnet faucet](https://faucet.circle.com/) and request test USDC for your connected address.

Pairband does not custody funds. The payer EOA must hold USDC on Arc before Pay.

## Recommended rehearsal addresses

| Role | Address | Notes |
|------|---------|--------|
| **Payer (fund this)** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | Anvil account #0 — common dev default; import locally only |
| **Payee (recipient)** | `0x1111111111111111111111111111111111111111` | Works for Arc testnet USDC transfers |
| Avoid | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | Anvil #1 — Arc USDC returns `Blocked address` |

You may use any wallet you control for payer/payee; these are documented defaults for scripted rehearsal.

## Local import (optional)

Anvil #0 private key (local dev only — **do not commit or share**):

```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

After faucet funding, connect on **Workspace → Sign in**, create an org, add the payee address, then **Pay** with a reference memo.

## Onchain contracts (Arc testnet)

See `deployments/arc-testnet.json` and `packages/config` for Memo, USDC, and EURC addresses used by verify and pay builders.
