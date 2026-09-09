export const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:3001";

export type ChainConfigResponse = {
  chain: { key: string; chainId: number; name: string; rpcUrl: string; explorerUrl: string };
  tokens: {
    USDC: { symbol: "USDC"; address: `0x${string}`; decimals: number };
    EURC: { symbol: "EURC"; address: `0x${string}`; decimals: number };
  };
  memo: `0x${string}` | null;
  eurcRoutesEnabled: boolean;
  convertFeeBps: number;
  defaultBandBps: number;
  quoteTtlMs: number;
};

export type QuoteResponse =
  | {
      executable: true;
      quoteId: string;
      tokenIn: "USDC" | "EURC";
      tokenOut: "USDC" | "EURC";
      amountOut: string;
      amountIn: string;
      bandBps: number | null;
      bandApplicable: boolean;
      feeBps: number;
      feeAmountIn: string;
      expiresAt: number;
      route: string;
      chainId: number;
    }
  | {
      executable: false;
      reason: string;
      message: string;
    };

export type ActivityItem = {
  id: string;
  txHash: string;
  payee: string;
  tokenOut: "USDC" | "EURC";
  amountOut: string;
  amountIn: string;
  tokenIn: "USDC" | "EURC";
  reference: string;
  memoId: string | null;
  status: "settled" | "failed" | "incomplete";
  chainId: number;
  createdAt: string;
  explorerUrl: string;
};

export async function fetchConfig(): Promise<ChainConfigResponse> {
  const res = await fetch(`${API_ORIGIN}/v1/config`, { cache: "no-store" });
  if (!res.ok) throw new Error("config_unavailable");
  return res.json();
}

export async function fetchQuote(body: {
  tokenIn: "USDC" | "EURC";
  tokenOut: "USDC" | "EURC";
  amountOut: string;
  bandBps?: number;
  payee?: string;
  reference?: string;
}): Promise<QuoteResponse> {
  const res = await fetch(`${API_ORIGIN}/v1/quotes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("quote_failed");
  return res.json();
}

export async function postReceipt(
  body: Omit<ActivityItem, "id" | "createdAt" | "explorerUrl"> & {
    payer?: string;
    orgId?: string;
    quoteId?: string;
  },
) {
  const res = await fetch(`${API_ORIGIN}/v1/receipts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("receipt_failed");
  return res.json() as Promise<ActivityItem>;
}

export async function fetchActivity(): Promise<ActivityItem[]> {
  const res = await fetch(`${API_ORIGIN}/v1/activity`, { cache: "no-store" });
  if (!res.ok) throw new Error("activity_failed");
  const data = (await res.json()) as { items: ActivityItem[] };
  return data.items;
}

export function formatUnits(raw: string, decimals: number): string {
  const n = BigInt(raw);
  const base = 10n ** BigInt(decimals);
  const whole = n / base;
  const frac = (n % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac ? `${whole.toLocaleString()}.${frac}` : whole.toLocaleString();
}

export function parseUnits(display: string, decimals: number): bigint {
  const cleaned = display.replace(/,/g, "").trim();
  if (!cleaned || !/^\d+(\.\d+)?$/.test(cleaned)) throw new Error("invalid_amount");
  const [w, f = ""] = cleaned.split(".");
  const frac = (f + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(w!) * 10n ** BigInt(decimals) + BigInt(frac || "0");
}
