import { createPublicClient, http, type Hex } from "viem";
import { ACTIVE_CHAIN } from "@pairband/config";

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

/**
 * Verify a pay tx settled on Arc: success status and to == Memo predeploy.
 * Does not fully decode Transfer/Memo events (follow-up indexer work).
 */
export async function verifyPayTransaction(txHash: Hex): Promise<{
  ok: boolean;
  reason?: string;
  blockNumber?: string;
  from?: string;
}> {
  const client = createArcClient();
  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
      return { ok: false, reason: "tx_reverted_or_pending" };
    }
    const memo = ACTIVE_CHAIN.memo?.toLowerCase();
    if (!memo) return { ok: false, reason: "memo_unconfigured" };
    if ((receipt.to ?? "").toLowerCase() !== memo) {
      return { ok: false, reason: "not_memo_target" };
    }
    return {
      ok: true,
      blockNumber: receipt.blockNumber.toString(),
      from: receipt.from.toLowerCase(),
    };
  } catch {
    return { ok: false, reason: "rpc_unavailable" };
  }
}
