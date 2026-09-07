/**
 * Semantic transaction checks for Pairband router/vault calls.
 * API and client share these assertions. No signing.
 */
import {
  encodeFunctionData,
  decodeFunctionData,
  parseAbi,
  type Hex,
  type Address,
} from "viem";
import type { UnsignedTransaction } from "./schemas.js";

export const ROUTER_ABI = parseAbi([
  "function buyExactOutput(bytes32 seriesId, uint256 optionUnits, uint256 maxUSDC6, uint256 deadline)",
  "function sellExactInput(bytes32 seriesId, uint256 optionUnits, uint256 minUSDC6, uint256 deadline)",
]);

export const VAULT_ABI = parseAbi([
  "function mint(uint256 q)",
  "function cancel(uint256 q)",
  "function exercise(uint256 q)",
  "function redeem(uint256 q)",
  "function finalize()",
]);

export function encodeBuyExactOutputCalldata(args: {
  seriesId: `0x${string}`;
  optionUnits: bigint;
  maxUSDC6: bigint;
  deadline: bigint;
}): Hex {
  return encodeFunctionData({
    abi: ROUTER_ABI,
    functionName: "buyExactOutput",
    args: [args.seriesId, args.optionUnits, args.maxUSDC6, args.deadline],
  });
}

export function encodeSellExactInputCalldata(args: {
  seriesId: `0x${string}`;
  optionUnits: bigint;
  minUSDC6: bigint;
  deadline: bigint;
}): Hex {
  return encodeFunctionData({
    abi: ROUTER_ABI,
    functionName: "sellExactInput",
    args: [args.seriesId, args.optionUnits, args.minUSDC6, args.deadline],
  });
}

export function encodeVaultCalldata(
  action: "mint" | "cancel" | "exercise" | "redeem" | "finalize",
  units?: bigint,
): Hex {
  if (action === "finalize") {
    return encodeFunctionData({ abi: VAULT_ABI, functionName: "finalize" });
  }
  if (units === undefined || units <= 0n) throw new Error("units required");
  return encodeFunctionData({
    abi: VAULT_ABI,
    functionName: action,
    args: [units],
  });
}

export type SemanticIssue = { code: string; message: string };

export function assertUnsignedTxShape(
  tx: UnsignedTransaction,
  expected: {
    chainId: number;
    from: Address;
    to: Address;
    allowValue?: boolean;
  },
): SemanticIssue[] {
  const issues: SemanticIssue[] = [];
  if (tx.chainId !== expected.chainId) {
    issues.push({
      code: "WRONG_CHAIN",
      message: `chainId ${tx.chainId} != ${expected.chainId}`,
    });
  }
  if (tx.from.toLowerCase() !== expected.from.toLowerCase()) {
    issues.push({ code: "ACCOUNT_MISMATCH", message: "from address mismatch" });
  }
  if (tx.to.toLowerCase() !== expected.to.toLowerCase()) {
    issues.push({ code: "WRONG_TARGET", message: "to address not allowlisted target" });
  }
  if (tx.value !== "0" && !expected.allowValue) {
    issues.push({ code: "NATIVE_VALUE", message: "native value must be 0" });
  }
  if (!tx.data.startsWith("0x") || tx.data.length < 10) {
    issues.push({ code: "EMPTY_CALLDATA", message: "calldata missing selector" });
  }
  return issues;
}

export function assertBuyExactOutputSemantics(
  data: Hex,
  expected: {
    seriesId: `0x${string}`;
    optionUnits: bigint;
    maxUSDC6: bigint;
    deadline: bigint;
  },
): SemanticIssue[] {
  const issues: SemanticIssue[] = [];
  try {
    const decoded = decodeFunctionData({ abi: ROUTER_ABI, data });
    if (decoded.functionName !== "buyExactOutput") {
      issues.push({ code: "WRONG_SELECTOR", message: `got ${decoded.functionName}` });
      return issues;
    }
    const [seriesId, optionUnits, maxUSDC6, deadline] = decoded.args as [
      `0x${string}`,
      bigint,
      bigint,
      bigint,
    ];
    if (seriesId.toLowerCase() !== expected.seriesId.toLowerCase()) {
      issues.push({ code: "SERIES_MISMATCH", message: "seriesId mismatch" });
    }
    if (optionUnits !== expected.optionUnits) {
      issues.push({ code: "AMOUNT_MISMATCH", message: "optionUnits mismatch" });
    }
    if (maxUSDC6 !== expected.maxUSDC6) {
      issues.push({ code: "SLIPPAGE_MISMATCH", message: "maxUSDC6 mismatch" });
    }
    if (deadline !== expected.deadline) {
      issues.push({ code: "DEADLINE_MISMATCH", message: "deadline mismatch" });
    }
    if (deadline <= 0n) {
      issues.push({ code: "DEADLINE", message: "deadline must be positive" });
    }
  } catch (e) {
    issues.push({ code: "DECODE_FAILED", message: (e as Error).message });
  }
  return issues;
}

export function assertVaultActionSemantics(
  data: Hex,
  action: "mint" | "cancel" | "exercise" | "redeem" | "finalize",
  units?: bigint,
): SemanticIssue[] {
  const issues: SemanticIssue[] = [];
  try {
    const decoded = decodeFunctionData({ abi: VAULT_ABI, data });
    if (decoded.functionName !== action) {
      issues.push({
        code: "WRONG_SELECTOR",
        message: `expected ${action}, got ${decoded.functionName}`,
      });
      return issues;
    }
    if (action !== "finalize") {
      const [q] = decoded.args as [bigint];
      if (units !== undefined && q !== units) {
        issues.push({ code: "AMOUNT_MISMATCH", message: "units mismatch" });
      }
      if (q <= 0n) issues.push({ code: "INVALID_AMOUNT", message: "units must be positive" });
    }
  } catch (e) {
    issues.push({ code: "DECODE_FAILED", message: (e as Error).message });
  }
  return issues;
}

/** Apply slippage to exact-output buy: max = ceil(expected * (10000+bps)/10000). */
export function maxUsdcWithSlippage(expectedUSDC6: bigint, slippageBps: number): bigint {
  if (slippageBps < 0 || slippageBps > 500) throw new Error("slippageBps out of policy");
  return (expectedUSDC6 * BigInt(10_000 + slippageBps) + 9_999n) / 10_000n;
}
