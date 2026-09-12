/**
 * Arc testnet live probes (read-only). No broadcasts.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPublicClient, encodeFunctionData, erc20Abi, http, parseAbi } from "viem";
import { ACTIVE_CHAIN } from "@pairband/config";

const client = createPublicClient({
  transport: http(ACTIVE_CHAIN.rpcUrl, {
    fetchOptions: { headers: { "User-Agent": "PairbandAudit/1.0" } },
  }),
});

describe("Arc testnet live", () => {
  it("chainId is 5042002", async () => {
    assert.equal(await client.getChainId(), 5042002);
  });

  it("Memo / USDC / EURC / Multicall3From have code", async () => {
    for (const addr of [
      ACTIVE_CHAIN.memo!,
      ACTIVE_CHAIN.tokens.USDC.address,
      ACTIVE_CHAIN.tokens.EURC.address,
      ACTIVE_CHAIN.multicall3From,
    ]) {
      const code = await client.getCode({ address: addr });
      assert.ok(code && code !== "0x", `no code at ${addr}`);
    }
  });

  it("USDC and EURC are 6 decimals", async () => {
    for (const token of [ACTIVE_CHAIN.tokens.USDC.address, ACTIVE_CHAIN.tokens.EURC.address]) {
      const decimals = await client.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "decimals",
      });
      assert.equal(decimals, 6);
    }
  });

  it("memo selector encoding is 0xc3b2c4f8", () => {
    const transferData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: ["0x1111111111111111111111111111111111111111", 1_000_000n],
    });
    const data = encodeFunctionData({
      abi: parseAbi(["function memo(address,bytes,bytes32,bytes)"]),
      functionName: "memo",
      args: [
        ACTIVE_CHAIN.tokens.USDC.address,
        transferData,
        `0x${Buffer.from("INV-1042").toString("hex").padEnd(64, "0")}`,
        `0x${Buffer.from("INV-1042").toString("hex")}`,
      ],
    });
    assert.equal(data.slice(0, 10), "0xc3b2c4f8");
  });

  it("empty Memo.memo call reverts (contract is live)", async () => {
    const data = encodeFunctionData({
      abi: parseAbi(["function memo(address,bytes,bytes32,bytes)"]),
      functionName: "memo",
      args: [
        ACTIVE_CHAIN.tokens.USDC.address,
        "0x",
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x",
      ],
    });
    await assert.rejects(() => client.call({ to: ACTIVE_CHAIN.memo!, data }));
  });

  it("no Uniswap V3 at canonical Ethereum factory addresses", async () => {
    for (const addr of [
      "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    ] as const) {
      const code = await client.getCode({ address: addr });
      assert.ok(!code || code === "0x");
    }
  });
});
