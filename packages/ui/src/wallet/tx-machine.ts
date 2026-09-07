export type TxPhase =
  | "editing"
  | "validating"
  | "awaiting_approval_signature"
  | "approval_submitted"
  | "approval_confirmed"
  | "reviewing"
  | "awaiting_action_signature"
  | "submitted"
  | "confirmed"
  | "rejected"
  | "quote_expired"
  | "reverted"
  | "replaced"
  | "cancelled"
  | "unknown"
  | "network_changed";

export type WalletConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "wrong_network"
  | "account_changed";

export type TxMachine = {
  phase: TxPhase;
  hash?: string;
  replacementHash?: string;
  errorCode?: string;
  message?: string;
};

export function nextTxPhase(current: TxPhase, event: string): TxPhase {
  const table: Record<string, Partial<Record<TxPhase, TxPhase>>> = {
    validate: { editing: "validating" },
    validated: { validating: "reviewing" },
    need_approval: { reviewing: "awaiting_approval_signature", validating: "awaiting_approval_signature" },
    approval_signed: { awaiting_approval_signature: "approval_submitted" },
    approval_mined: { approval_submitted: "approval_confirmed" },
    review: { approval_confirmed: "reviewing", editing: "reviewing" },
    sign_action: { reviewing: "awaiting_action_signature" },
    submitted: { awaiting_action_signature: "submitted" },
    confirmed: { submitted: "confirmed", replaced: "confirmed" },
    reject: {
      awaiting_approval_signature: "rejected",
      awaiting_action_signature: "rejected",
    },
    quote_expired: { reviewing: "quote_expired", validating: "quote_expired" },
    revert: { submitted: "reverted" },
    replace: { submitted: "replaced" },
    cancel: { reviewing: "cancelled", editing: "cancelled" },
    unknown: { submitted: "unknown" },
    network_changed: {
      editing: "network_changed",
      reviewing: "network_changed",
      awaiting_action_signature: "network_changed",
    },
    reset: {
      rejected: "editing",
      quote_expired: "editing",
      reverted: "editing",
      cancelled: "editing",
      unknown: "editing",
      network_changed: "editing",
      confirmed: "editing",
    },
  };
  return table[event]?.[current] ?? current;
}

export const ARC_TESTNET_CHAIN = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.io"] } },
  blockExplorers: {
    default: { name: "ArcScan Testnet", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
} as const;
