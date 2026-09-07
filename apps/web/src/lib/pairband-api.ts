import type { QuoteResponse } from "@pairband/sdk";

export function apiOrigin(): string {
  return process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:3001";
}

export type SeriesCard = {
  seriesId: string;
  vault: string;
  longToken: string;
  writerReceipt: string;
  strikePerUnit6: string;
  tradingStart: string;
  exerciseStart: string;
  exerciseEnd: string;
  paused?: boolean;
  accounting?: {
    writerUnits: string;
    exercisedUnits: string;
    redeemedUnits: string;
    accountedUsdc6: string;
    accountedEurc6: string;
  } | null;
};

export async function fetchSeriesList(): Promise<{
  ok: boolean;
  status: number;
  series: SeriesCard[];
  note: string;
  source?: string;
}> {
  try {
    const res = await fetch(`${apiOrigin()}/v1/series`, { credentials: "include" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        ok: false,
        status: res.status,
        series: [],
        note: (body as { error?: { message?: string } })?.error?.message ?? `Series unavailable (${res.status})`,
      };
    }
    const body = (await res.json()) as { series: SeriesCard[]; note?: string; source?: string };
    return {
      ok: true,
      status: res.status,
      series: body.series ?? [],
      note: body.note ?? "",
      ...(body.source !== undefined ? { source: body.source } : {}),
    };
  } catch {
    return { ok: false, status: 0, series: [], note: "API unreachable" };
  }
}

export async function fetchQuote(args: {
  seriesId: string;
  side: "buy" | "sell";
  optionUnits: string;
  account: string;
  slippageBps?: number;
}): Promise<{ ok: true; quote: QuoteResponse } | { ok: false; message: string; status: number }> {
  const res = await fetch(`${apiOrigin()}/v1/quotes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      seriesId: args.seriesId,
      side: args.side,
      optionUnits: args.optionUnits,
      account: args.account,
      slippageBps: args.slippageBps ?? 50,
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    return { ok: false, message: body?.error?.message ?? `Quote failed (${res.status})`, status: res.status };
  }
  return { ok: true, quote: body as QuoteResponse };
}

export async function fetchWalletPositions(address: string): Promise<{
  ok: boolean;
  status: number;
  longs: unknown[];
  receipts: unknown[];
  liquidity: unknown[];
  note: string;
}> {
  const res = await fetch(`${apiOrigin()}/v1/wallets/${address}/positions`, { credentials: "include" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      longs: [],
      receipts: [],
      liquidity: [],
      note: body?.error?.message ?? `Positions unavailable (${res.status})`,
    };
  }
  return {
    ok: true,
    status: res.status,
    longs: body.longs ?? [],
    receipts: body.receipts ?? [],
    liquidity: body.liquidity ?? [],
    note: body.note ?? "",
  };
}
