import {
  decodeEventLog,
  type Hex,
  type Log,
  type Address,
} from "viem";
import {
  PAIRBAND_EVENT_ITEMS,
  TOPIC0,
  type PairbandEventName,
} from "./abi/events.js";

export type DecodedIndexedEvent = {
  name: PairbandEventName | "Unknown";
  args: Record<string, unknown>;
  emitter: Address;
  topic0: Hex;
  blockNumber: bigint;
  blockHash: Hex;
  txHash: Hex;
  logIndex: number;
  raw: Log;
};

export function decodePairbandLog(log: Log): DecodedIndexedEvent {
  const topic0 = (log.topics[0] ?? "0x") as Hex;
  const base = {
    emitter: log.address,
    topic0,
    blockNumber: log.blockNumber ?? 0n,
    blockHash: (log.blockHash ?? "0x") as Hex,
    txHash: (log.transactionHash ?? "0x") as Hex,
    logIndex: log.logIndex ?? 0,
    raw: log,
  };

  const name = (Object.entries(TOPIC0).find(([, h]) => h === topic0)?.[0] ??
    "Unknown") as PairbandEventName | "Unknown";

  if (name === "Unknown") {
    return { ...base, name, args: {} };
  }

  try {
    const decoded = decodeEventLog({
      abi: PAIRBAND_EVENT_ITEMS,
      data: log.data,
      topics: log.topics,
      strict: false,
    });
    return {
      ...base,
      name: decoded.eventName as PairbandEventName,
      args: decoded.args as unknown as Record<string, unknown>,
    };
  } catch {
    return { ...base, name: "Unknown", args: {} };
  }
}

export function sortLogs(logs: Log[]): Log[] {
  return [...logs].sort((a, b) => {
    const bn = Number((a.blockNumber ?? 0n) - (b.blockNumber ?? 0n));
    if (bn !== 0) return bn;
    return (a.logIndex ?? 0) - (b.logIndex ?? 0);
  });
}
