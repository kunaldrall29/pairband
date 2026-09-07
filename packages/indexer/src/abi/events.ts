/**
 * Frozen Pairband event ABI fragments for indexing (O12).
 * Sourced from packages/contracts on protocol bootstrap; not Graph-dependent.
 * Label: Pairband-deployed fixtures — not official Uniswap Arc listings.
 */
import { parseAbiItem, toEventHash } from "viem";

export const SERIES_CREATED = parseAbiItem(
  "event SeriesCreated(bytes32 indexed seriesId, address indexed vault, address longToken, address writerReceipt, uint256 strikePerUnit6, uint64 tradingStart, uint64 exerciseStart, uint64 exerciseEnd, uint256 maxWriterUnits, uint16 issuanceFeeBps)",
);

export const NEW_RISK_PAUSE = parseAbiItem(
  "event NewRiskPauseChanged(bytes32 indexed seriesId, bool paused)",
);

export const OPTIONS_MINTED = parseAbiItem(
  "event OptionsMinted(bytes32 indexed seriesId, address indexed account, uint256 units, uint256 collateral6, uint256 fee6)",
);

export const OPTIONS_CANCELLED = parseAbiItem(
  "event OptionsCancelled(bytes32 indexed seriesId, address indexed account, uint256 units, uint256 returnedUSDC6)",
);

export const OPTIONS_EXERCISED = parseAbiItem(
  "event OptionsExercised(bytes32 indexed seriesId, address indexed account, uint256 units, uint256 eurcIn6, uint256 usdcOut6)",
);

export const SERIES_FINALIZED = parseAbiItem(
  "event SeriesFinalized(bytes32 indexed seriesId, uint256 writerUnits, uint256 usdc6, uint256 eurc6)",
);

export const WRITER_REDEEMED = parseAbiItem(
  "event WriterRedeemed(bytes32 indexed seriesId, address indexed account, uint256 units, uint256 usdcOut6, uint256 eurcOut6)",
);

// Matches PairbandLifecycleHook.MarketRegistered (PoolId = bytes32; Currency = address).
export const MARKET_REGISTERED = parseAbiItem(
  "event MarketRegistered(bytes32 indexed seriesId, bytes32 indexed poolId, address vault, address currency0, address currency1, uint24 fee, int24 tickSpacing, uint160 sqrtPriceX96)",
);

export const ROUTER_BOUGHT = parseAbiItem(
  "event Bought(bytes32 indexed seriesId, address indexed account, uint256 optionUnits, uint256 usdcPaid6, bytes32 poolId)",
);

export const ROUTER_SOLD = parseAbiItem(
  "event Sold(bytes32 indexed seriesId, address indexed account, uint256 optionUnits, uint256 usdcReceived6, bytes32 poolId)",
);

export const ERC20_TRANSFER = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

export const PAIRBAND_EVENT_ITEMS = [
  SERIES_CREATED,
  NEW_RISK_PAUSE,
  OPTIONS_MINTED,
  OPTIONS_CANCELLED,
  OPTIONS_EXERCISED,
  SERIES_FINALIZED,
  WRITER_REDEEMED,
  MARKET_REGISTERED,
  ROUTER_BOUGHT,
  ROUTER_SOLD,
  ERC20_TRANSFER,
] as const;

export const TOPIC0 = {
  SeriesCreated: toEventHash(SERIES_CREATED),
  NewRiskPauseChanged: toEventHash(NEW_RISK_PAUSE),
  OptionsMinted: toEventHash(OPTIONS_MINTED),
  OptionsCancelled: toEventHash(OPTIONS_CANCELLED),
  OptionsExercised: toEventHash(OPTIONS_EXERCISED),
  SeriesFinalized: toEventHash(SERIES_FINALIZED),
  WriterRedeemed: toEventHash(WRITER_REDEEMED),
  MarketRegistered: toEventHash(MARKET_REGISTERED),
  Bought: toEventHash(ROUTER_BOUGHT),
  Sold: toEventHash(ROUTER_SOLD),
  Transfer: toEventHash(ERC20_TRANSFER),
} as const;

export type PairbandEventName = keyof typeof TOPIC0;
