/**
 * Typed Arc chain config + address book.
 * Production builds must not hardcode testnet-only addresses as mainnet truth.
 */

export type HexAddress = `0x${string}`;

export type ListedToken = {
  symbol: "USDC" | "EURC";
  address: HexAddress;
  decimals: number;
  /** Native gas token on Arc is USDC system token — never treat as WETH. */
  isNativeGas?: boolean;
};

export type UniswapV3Addresses = {
  factory: HexAddress | null;
  swapRouter02: HexAddress | null;
  quoterV2: HexAddress | null;
  universalRouter: HexAddress | null;
};

export type ArcChainConfig = {
  key: "arc-testnet" | "arc-mainnet";
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: { name: string; symbol: "USDC"; decimals: 18 };
  tokens: Record<"USDC" | "EURC", ListedToken>;
  memo: HexAddress | null;
  permit2: HexAddress;
  multicall3From: HexAddress;
  uniswapV3: UniswapV3Addresses;
  cctp: {
    domain: number;
    tokenMessenger: HexAddress | null;
    messageTransmitter: HexAddress | null;
  };
  /** Kill switch: hide EURC routes without redeploy. */
  eurcRoutesEnabled: boolean;
  /** Convert fee in bps (shown before sign). Same-asset pay fee is 0. */
  convertFeeBps: number;
  treasury: HexAddress | null;
  /** Default band vs mid for convert / cross-asset pay. */
  defaultBandBps: number;
  quoteTtlMs: number;
};

/** Canonical Multicall3From on Arc (msg.sender preserved). */
export const MULTICALL3_FROM = "0x522fAf9A91c41c443c66765030741e4AaCe147D0" as const;

/** Canonical Permit2 (same on most EVM chains). */
export const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as const;

/**
 * Arc testnet (rehearsal). Addresses from Circle Arc docs / prior preflight.
 * Confirm before any broadcast.
 */
export const ARC_TESTNET: ArcChainConfig = {
  key: "arc-testnet",
  name: "Arc Testnet",
  chainId: 5042002,
  rpcUrl: "https://rpc.testnet.arc.io",
  explorerUrl: "https://testnet.arcscan.app",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  tokens: {
    USDC: {
      symbol: "USDC",
      address: "0x3600000000000000000000000000000000000000",
      decimals: 6,
      isNativeGas: true,
    },
    EURC: {
      symbol: "EURC",
      address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
      decimals: 6,
    },
  },
  memo: "0x5294E9927c3306DcBaDb03fe70b92e01cCede505",
  permit2: PERMIT2,
  multicall3From: MULTICALL3_FROM,
  uniswapV3: {
    // Bind when verified on this chain; null → quote engine stubs / refuses FX.
    factory: null,
    swapRouter02: null,
    quoterV2: null,
    universalRouter: null,
  },
  cctp: {
    domain: 26,
    tokenMessenger: null,
    messageTransmitter: null,
  },
  // No measured USDC/EURC pool on testnet → hide EURC convert/pay until true.
  eurcRoutesEnabled: false,
  convertFeeBps: 20,
  treasury: null,
  defaultBandBps: 15,
  quoteTtlMs: 8_000,
};

/**
 * Arc mainnet — placeholders until Circle publishes day-of addresses.
 * Do not use these zeros in production signing paths.
 * Override via apps that read env and call `withMainnetOverrides`.
 */
export const ARC_MAINNET: ArcChainConfig = {
  key: "arc-mainnet",
  name: "Arc",
  chainId: 5042,
  rpcUrl: "https://rpc.arc.network",
  explorerUrl: "https://arcscan.io",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  tokens: {
    USDC: {
      symbol: "USDC",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 6,
      isNativeGas: true,
    },
    EURC: {
      symbol: "EURC",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 6,
    },
  },
  memo: null,
  permit2: PERMIT2,
  multicall3From: MULTICALL3_FROM,
  uniswapV3: {
    factory: null,
    swapRouter02: null,
    quoterV2: null,
    universalRouter: null,
  },
  cctp: {
    domain: 26,
    tokenMessenger: null,
    messageTransmitter: null,
  },
  eurcRoutesEnabled: false,
  convertFeeBps: 20,
  treasury: null,
  defaultBandBps: 15,
  quoteTtlMs: 8_000,
};

export const CHAINS = {
  [ARC_TESTNET.chainId]: ARC_TESTNET,
  [ARC_MAINNET.chainId]: ARC_MAINNET,
} as const;

export function getChainConfig(chainId: number): ArcChainConfig | undefined {
  return CHAINS[chainId as keyof typeof CHAINS];
}

/** Active rehearsal chain for P0. */
export const ACTIVE_CHAIN = ARC_TESTNET;

export const ALLOWED_TOKENS = ["USDC", "EURC"] as const;
export type AllowedToken = (typeof ALLOWED_TOKENS)[number];
