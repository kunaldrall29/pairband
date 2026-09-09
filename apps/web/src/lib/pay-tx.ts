import { encodeFunctionData, erc20Abi, type Hex } from "viem";
import { ACTIVE_CHAIN } from "@pairband/config";

/** Minimal Arc Memo write — bytes32 id + payload. Confirm ABI against live predeploy. */
export const ARC_MEMO_ABI = [
  {
    type: "function",
    name: "write",
    stateMutability: "nonpayable",
    inputs: [
      { name: "memoId", type: "bytes32" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

export function referenceToMemoId(reference: string): Hex {
  // Deterministic bytes32 from UTF-8 reference (padded / hashed via simple encode).
  const encoder = new TextEncoder();
  const bytes = encoder.encode(reference.slice(0, 32));
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex.padEnd(64, "0")}` as Hex;
}

export function buildUsdcTransfer(params: {
  to: `0x${string}`;
  amount: bigint;
}): { to: `0x${string}`; data: Hex; value?: bigint } {
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [params.to, params.amount],
  });
  return {
    to: ACTIVE_CHAIN.tokens.USDC.address,
    data,
  };
}

export function buildMemoWrite(params: {
  reference: string;
}): { to: `0x${string}`; data: Hex } | null {
  if (!ACTIVE_CHAIN.memo) return null;
  const memoId = referenceToMemoId(params.reference);
  const bytes = new TextEncoder().encode(params.reference);
  const payload =
    `0x${Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}` as Hex;
  const data = encodeFunctionData({
    abi: ARC_MEMO_ABI,
    functionName: "write",
    args: [memoId, payload],
  });
  return { to: ACTIVE_CHAIN.memo, data };
}

/**
 * P0 path: two sequential txs (transfer then memo) when no multicall helper is deployed.
 * UI must never mark settled until both succeed (or memo-only failure → incomplete).
 */
export type PreparedPayStep = {
  label: string;
  to: `0x${string}`;
  data: Hex;
};

export function prepareSameAssetUsdcPay(params: {
  payee: `0x${string}`;
  amount: bigint;
  reference: string;
}): PreparedPayStep[] {
  const transfer = buildUsdcTransfer({ to: params.payee, amount: params.amount });
  const steps: PreparedPayStep[] = [
    { label: "Transfer USDC", to: transfer.to, data: transfer.data },
  ];
  const memo = buildMemoWrite({ reference: params.reference });
  if (memo) {
    steps.push({ label: "Write memo", to: memo.to, data: memo.data });
  }
  return steps;
}
