import {
  createPublicClient,
  decodeEventLog,
  encodeFunctionData,
  erc20Abi,
  http,
  keccak256,
  toBytes,
  toHex,
  type Hex,
} from "viem";
import { ACTIVE_CHAIN } from "@pairband/config";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" as const;

const MEMO_ABI = [
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

const arc = {
  id: ACTIVE_CHAIN.chainId,
  name: ACTIVE_CHAIN.name,
  nativeCurrency: ACTIVE_CHAIN.nativeCurrency,
  rpcUrls: { default: { http: [ACTIVE_CHAIN.rpcUrl] } },
} as const;

export function createArcClient() {
  return createPublicClient({
    chain: arc,
    transport: http(ACTIVE_CHAIN.rpcUrl, {
      fetchOptions: { headers: { "User-Agent": "Pairband/1.0" } },
    }),
  });
}

export type PayVerifyExpected = {
  payer: string;
  payee: string;
  amountOut: bigint;
  tokenOut: Hex;
  reference: string;
  memoId?: Hex;
};

export type PayVerifyResult = {
  ok: boolean;
  reason?: string;
  blockNumber?: string;
  from?: string;
  transfer?: { from: string; to: string; value: bigint };
  memo?: { memoId: Hex; memoBytes: Hex; target: string };
};

function referenceToMemoId(reference: string): Hex {
  const bytes = new TextEncoder().encode(reference.slice(0, 32));
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex.padEnd(64, "0")}` as Hex;
}

/** Expected inner transfer calldata for Memo-wrapped USDC pay. */
export function expectedTransferCalldata(payee: Hex, amount: bigint): Hex {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [payee, amount],
  });
}

/** Hash Memo uses for inner call data (verify against Memo event). */
export function callDataHash(transferData: Hex): Hex {
  return keccak256(transferData);
}

export function referenceToMemoBytes(reference: string): Hex {
  return toHex(new TextEncoder().encode(reference));
}

/**
 * Verify Memo-wrapped USDC pay: tx success, Memo target, Transfer amount/payee,
 * and Memo event payload vs reference.
 */
export async function verifyPayTransaction(
  txHash: Hex,
  expected: PayVerifyExpected,
): Promise<PayVerifyResult> {
  const client = createArcClient();
  const usdc = ACTIVE_CHAIN.tokens.USDC.address.toLowerCase();
  const memoAddr = ACTIVE_CHAIN.memo?.toLowerCase();
  if (!memoAddr) return { ok: false, reason: "memo_unconfigured" };

  const expectedPayee = expected.payee.toLowerCase();
  const expectedPayer = expected.payer.toLowerCase();
  const expectedMemoId = (expected.memoId ?? referenceToMemoId(expected.reference)).toLowerCase();
  const expectedMemoBytes = referenceToMemoBytes(expected.reference).toLowerCase();
  const innerData = expectedTransferCalldata(expected.payee as Hex, expected.amountOut);
  const innerHash = callDataHash(innerData).toLowerCase();

  try {
    const [receipt, tx] = await Promise.all([
      client.getTransactionReceipt({ hash: txHash }),
      client.getTransaction({ hash: txHash }),
    ]);

    if (receipt.status !== "success") {
      return { ok: false, reason: "tx_reverted_or_pending" };
    }
    if ((receipt.to ?? "").toLowerCase() !== memoAddr) {
      return { ok: false, reason: "not_memo_target" };
    }
    if (tx.from.toLowerCase() !== expectedPayer) {
      return { ok: false, reason: "tx_from_mismatch" };
    }

    let transferMatch: PayVerifyResult["transfer"];
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== usdc) continue;
      if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC) continue;
      const decoded = decodeEventLog({
        abi: erc20Abi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "Transfer") continue;
      const { from, to, value } = decoded.args;
      if (to.toLowerCase() === expectedPayee && value === expected.amountOut) {
        transferMatch = {
          from: from.toLowerCase(),
          to: to.toLowerCase(),
          value,
        };
        break;
      }
    }
    if (!transferMatch) {
      return { ok: false, reason: "transfer_mismatch", from: tx.from.toLowerCase() };
    }

    let memoMatch: PayVerifyResult["memo"];
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== memoAddr) continue;
      try {
        const decoded = decodeEventLog({
          abi: MEMO_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName !== "Memo") continue;
        const memoId = decoded.args.memoId.toLowerCase();
        const memoBytes = toHex(decoded.args.memo).toLowerCase();
        const target = decoded.args.target.toLowerCase();
        const callHash = decoded.args.callDataHash.toLowerCase();
        if (
          memoId === expectedMemoId &&
          memoBytes === expectedMemoBytes &&
          target === usdc &&
          callHash === innerHash
        ) {
          memoMatch = {
            memoId: decoded.args.memoId,
            memoBytes: toHex(decoded.args.memo),
            target,
          };
          break;
        }
      } catch {
        /* not a Memo log */
      }
    }
    if (!memoMatch) {
      return {
        ok: false,
        reason: "memo_event_mismatch",
        from: tx.from.toLowerCase(),
        transfer: transferMatch,
      };
    }

    return {
      ok: true,
      blockNumber: receipt.blockNumber.toString(),
      from: tx.from.toLowerCase(),
      transfer: transferMatch,
      memo: memoMatch,
    };
  } catch {
    return { ok: false, reason: "rpc_unavailable" };
  }
}
