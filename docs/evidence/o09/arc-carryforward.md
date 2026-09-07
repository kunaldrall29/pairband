# O09 → O10 Arc carry-forward

Local Anvil (Cancun profile in `foundry.toml`) does **not** prove Arc testnet behavior.

| Gap | Why local misses it | O10 action |
| --- | --- | --- |
| Osaka EVM | Foundry profile is `cancun` | Deploy/smoke on `https://rpc.testnet.arc.io`; record opcode differences |
| Gas floor 20 Gwei | Anvil free gas | Explicit gas price in scripts |
| Native USDC 18 vs ERC-20 USDC 6 | Mocks use 6 | Use documented Arc USDC addresses only |
| Blocklist / restricted precompiles | Absent on Anvil | Probe restricted calls |
| Multicall3From sender preservation | Not exercised | Router/POSM entry via multicall patterns |
| System emitter `0xfff…ffe` | N/A locally | Observe logs if relevant |
| Pairband-deployed PoolManager/POSM on Arc | Fixtures only | Label self-deploy; never claim official Uniswap listing |

Do not mark Arc integration complete from O09 alone.
