import {
  encodeEventTopics,
  encodeAbiParameters,
  type Hex,
  type Log,
  type Address,
} from "viem";
import {
  OPTIONS_CANCELLED,
  OPTIONS_EXERCISED,
  OPTIONS_MINTED,
  SERIES_CREATED,
  SERIES_FINALIZED,
  WRITER_REDEEMED,
  ROUTER_BOUGHT,
  ERC20_TRANSFER,
} from "../abi/events.js";
import type { BlockMeta, IngestBatch } from "../ingest.js";

const SERIES = "0x1111111111111111111111111111111111111111111111111111111111111111" as Hex;
const VAULT = "0x2222222222222222222222222222222222222222" as Address;
const LONG = "0x3333333333333333333333333333333333333333" as Address;
const RECEIPT = "0x4444444444444444444444444444444444444444" as Address;
const ACCOUNT = "0x5555555555555555555555555555555555555555" as Address;
const FACTORY = "0x6666666666666666666666666666666666666666" as Address;
const ROUTER = "0x7777777777777777777777777777777777777777" as Address;
const POOL = "0x8888888888888888888888888888888888888888888888888888888888888888" as Hex;
const ZERO = "0x0000000000000000000000000000000000000000" as Address;

function logFrom(
  event: Parameters<typeof encodeEventTopics>[0]["abi"][number],
  args: Record<string, unknown>,
  meta: {
    address: Address;
    blockNumber: bigint;
    blockHash: Hex;
    txHash: Hex;
    logIndex: number;
  },
): Log {
  const topics = encodeEventTopics({
    abi: [event],
    eventName: (event as { name: string }).name,
    args: args as never,
  });
  // non-indexed params as data — encodeAbiParameters of inputs without indexed
  const dataInputs = (event as { inputs: { indexed?: boolean; type: string; name?: string }[] }).inputs.filter(
    (i) => !i.indexed,
  );
  const dataValues = dataInputs.map((i) => args[i.name ?? ""]);
  const data =
    dataInputs.length === 0
      ? ("0x" as Hex)
      : encodeAbiParameters(
          dataInputs.map((i) => ({ type: i.type, name: i.name })),
          dataValues as never[],
        );
  return {
    address: meta.address,
    topics: topics as [Hex, ...Hex[]],
    data,
    blockNumber: meta.blockNumber,
    blockHash: meta.blockHash,
    transactionHash: meta.txHash,
    logIndex: meta.logIndex,
    removed: false,
    transactionIndex: 0,
  };
}

const B1 = {
  number: 1n,
  hash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hex,
  parentHash: "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex,
  timestamp: 1_700_000_000n,
};
const B2 = {
  number: 2n,
  hash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as Hex,
  parentHash: B1.hash,
  timestamp: 1_700_000_012n,
};
const B3 = {
  number: 3n,
  hash: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" as Hex,
  parentHash: B2.hash,
  timestamp: 1_700_000_024n,
};

/** Deterministic fixture: mint 100 options, exercise 40, finalize, redeem 60, router buy attribution. */
export function fixtureLifecycleBatches(): { batches: IngestBatch[]; seriesId: Hex; blocks: BlockMeta[] } {
  const strike = 110n;
  const mintUnits = 100_000_000n; // 100 whole
  const collateral = mintUnits * strike; // 11_000_000_000
  const exerciseUnits = 40_000_000n;
  const eurcIn = exerciseUnits * 100n;
  const usdcOut = exerciseUnits * strike;

  const created = logFrom(
    SERIES_CREATED,
    {
      seriesId: SERIES,
      vault: VAULT,
      longToken: LONG,
      writerReceipt: RECEIPT,
      strikePerUnit6: strike,
      tradingStart: 1_000n,
      exerciseStart: 2_000n,
      exerciseEnd: 3_000n,
      maxWriterUnits: 10n ** 12n,
      issuanceFeeBps: 0,
    },
    { address: FACTORY, blockNumber: 1n, blockHash: B1.hash, txHash: "0x01", logIndex: 0 },
  );

  const minted = logFrom(
    OPTIONS_MINTED,
    { seriesId: SERIES, account: ACCOUNT, units: mintUnits, collateral6: collateral, fee6: 0n },
    { address: VAULT, blockNumber: 1n, blockHash: B1.hash, txHash: "0x01", logIndex: 1 },
  );

  const longMint = logFrom(
    ERC20_TRANSFER,
    { from: ZERO, to: ACCOUNT, value: mintUnits },
    { address: LONG, blockNumber: 1n, blockHash: B1.hash, txHash: "0x01", logIndex: 2 },
  );

  const exercised = logFrom(
    OPTIONS_EXERCISED,
    { seriesId: SERIES, account: ACCOUNT, units: exerciseUnits, eurcIn6: eurcIn, usdcOut6: usdcOut },
    { address: VAULT, blockNumber: 2n, blockHash: B2.hash, txHash: "0x02", logIndex: 0 },
  );

  const bought = logFrom(
    ROUTER_BOUGHT,
    {
      seriesId: SERIES,
      account: ACCOUNT,
      optionUnits: 1_000_000n,
      usdcPaid6: 2_000_000n,
      poolId: POOL,
    },
    { address: ROUTER, blockNumber: 2n, blockHash: B2.hash, txHash: "0x03", logIndex: 1 },
  );

  const finalized = logFrom(
    SERIES_FINALIZED,
    {
      seriesId: SERIES,
      writerUnits: mintUnits,
      usdc6: collateral - usdcOut,
      eurc6: eurcIn,
    },
    { address: VAULT, blockNumber: 3n, blockHash: B3.hash, txHash: "0x04", logIndex: 0 },
  );

  const redeemUnits = 60_000_000n;
  // cumulative allocation: first 60 of 100 → 0.6 of reserves
  const redeemUsdc = ((0n + redeemUnits) * (collateral - usdcOut)) / mintUnits - 0n;
  const redeemEurc = ((0n + redeemUnits) * eurcIn) / mintUnits - 0n;
  const redeemed = logFrom(
    WRITER_REDEEMED,
    {
      seriesId: SERIES,
      account: ACCOUNT,
      units: redeemUnits,
      usdcOut6: redeemUsdc,
      eurcOut6: redeemEurc,
    },
    { address: VAULT, blockNumber: 3n, blockHash: B3.hash, txHash: "0x04", logIndex: 1 },
  );

  const batches: IngestBatch[] = [
    { blocks: [B1], logs: [created, minted, longMint] },
    { blocks: [B2], logs: [exercised, bought] },
    { blocks: [B3], logs: [finalized, redeemed] },
  ];

  return { batches, seriesId: SERIES, blocks: [B1, B2, B3] };
}

export function fixtureDuplicateAndConflict(): {
  first: IngestBatch;
  duplicate: IngestBatch;
  conflict: IngestBatch;
} {
  const { batches } = fixtureLifecycleBatches();
  const first = batches[0]!;
  const duplicate = first;
  const conflict: IngestBatch = {
    blocks: [
      {
        number: 1n,
        hash: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        parentHash: first.blocks[0]!.parentHash,
        timestamp: first.blocks[0]!.timestamp,
      },
    ],
    logs: first.logs.map((l) => ({
      ...l,
      blockHash: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd" as Hex,
    })),
  };
  return { first, duplicate, conflict };
}

export const FIXTURE_ADDR = { SERIES, VAULT, LONG, RECEIPT, ACCOUNT, FACTORY, ROUTER, POOL };
