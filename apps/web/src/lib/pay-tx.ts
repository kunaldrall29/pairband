/**
 * Arc Memo + USDC pay builders.
 * Correct P0 path: one tx via Memo.memo(target, transferData, memoId, memoData)
 * so msg.sender stays the EOA (CallFrom) and USDC + invoice leave together.
 */
import { encodeFunctionData, erc20Abi, toHex, type Hex } from "viem";
import { ACTIVE_CHAIN } from "@pairband/config";

export const ARC_MEMO_ABI = [
  {
    type: "function",
    name: "memo",
    stateMutability: "nonpayable",
    inputs: [
      { name: "target", type: "address" },
      { name: "data", type: "bytes" },
      { name: "memoId", type: "bytes32" },
      { name: "memoData", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "Memo",
    anonymous: false,
    inputs: [
      { name: "sender", type: "address", indexed: true },
      { name: "target", type: "address", indexed: true },
      { name: "callDataHash", type: "bytes32", indexed: false },
      { name: "memoId", type: "bytes32", indexed: true },
      { name: "memo", type: "bytes", indexed: false },
      { name: "memoIndex", type: "uint256", indexed: false },
    ],
  },
] as const;

export const MULTICALL3_FROM = "0x522fAf9A91c41c443c66765030741e4AaCe147D0" as const;

export function referenceToMemoId(reference: string): Hex {
  const bytes = new TextEncoder().encode(reference.slice(0, 32));
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex.padEnd(64, "0")}` as Hex;
}

export function referenceToMemoBytes(reference: string): Hex {
  return toHex(new TextEncoder().encode(reference));
}

export type PreparedPayTx = {
  to: `0x${string}`;
  data: Hex;
  /** Explicit gas — Arc Memo estimation via eth_estimateGas is unreliable. */
  gas: bigint;
  memoId: Hex;
  label: string;
};

/**
 * Single-tx same-asset USDC pay with Arc Memo wrapper.
 */
export function prepareSameAssetUsdcPay(params: {
  payee: `0x${string}`;
  amount: bigint;
  reference: string;
}): PreparedPayTx {
  if (!ACTIVE_CHAIN.memo) {
    throw new Error("Memo address not configured");
  }
  const transferData = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [params.payee, params.amount],
  });
  const memoId = referenceToMemoId(params.reference);
  const memoData = referenceToMemoBytes(params.reference);
  const data = encodeFunctionData({
    abi: ARC_MEMO_ABI,
    functionName: "memo",
    args: [ACTIVE_CHAIN.tokens.USDC.address, transferData, memoId, memoData],
  });
  return {
    to: ACTIVE_CHAIN.memo,
    data,
    gas: 350_000n,
    memoId,
    label: "Pay USDC + memo",
  };
}
