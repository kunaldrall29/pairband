/** Same-origin API (Next.js rewrite → backend). Session is cookie-only. */
export const API_BASE = "/api";

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
  status: "settled" | "failed" | "incomplete" | "submitted";
  chainId: number;
  createdAt: string;
  explorerUrl: string;
};

export type PayAuthorizeResponse =
  | { ok: true; spent: string; remaining: string | null }
  | { ok: false; error: "spend_limit_exceeded"; spent: string; limit: string };

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type") && init?.body) {
    headers.set("content-type", "application/json");
  }
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
}

export async function fetchConfig(): Promise<ChainConfigResponse> {
  const res = await apiFetch("/v1/config", { cache: "no-store" });
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
  const res = await apiFetch("/v1/quotes", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("quote_failed");
  return res.json();
}

export async function payAuthorize(orgId: string, amountIn: string): Promise<PayAuthorizeResponse> {
  const res = await apiFetch(`/v1/orgs/${orgId}/pay-authorize`, {
    method: "POST",
    body: JSON.stringify({ amountIn }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 403 && body.error === "spend_limit_exceeded") {
    return {
      ok: false,
      error: "spend_limit_exceeded",
      spent: body.spent as string,
      limit: body.limit as string,
    };
  }
  if (!res.ok) throw new Error((body.error as string) ?? "authorize_failed");
  return body as PayAuthorizeResponse;
}

export async function postReceipt(
  body: Omit<ActivityItem, "id" | "createdAt" | "explorerUrl"> & {
    payer?: string;
    orgId?: string;
    quoteId?: string;
  },
) {
  const res = await apiFetch("/v1/receipts", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "receipt_failed");
  }
  return res.json() as Promise<ActivityItem>;
}

export async function fetchActivity(): Promise<ActivityItem[]> {
  const res = await apiFetch("/v1/activity", { cache: "no-store" });
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
