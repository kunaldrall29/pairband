"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatAmount, tokens } from "@pairband/ui";
import { displayedStrike, formatRaw6, phaseAt, parseWholeOptions } from "@pairband/domain";
import type { QuoteResponse } from "@pairband/sdk";
import { useAccount } from "wagmi";
import { fetchQuote, fetchSeriesList, type SeriesCard } from "../../lib/pairband-api";

type StatusFilter = "all" | "trading" | "exercise" | "matured" | "scheduled";

function seriesStatus(s: SeriesCard, nowSec: bigint) {
  return phaseAt(nowSec, BigInt(s.tradingStart), BigInt(s.exerciseStart), BigInt(s.exerciseEnd));
}

const th: React.CSSProperties = { padding: "8px 10px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "10px", fontVariantNumeric: "tabular-nums" };

export function MarketsTable() {
  const [series, setSeries] = useState<SeriesCard[]>([]);
  const [note, setNote] = useState("Loading…");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [strikeFilter, setStrikeFilter] = useState("");
  const nowSec = BigInt(Math.floor(Date.now() / 1000));

  const load = useCallback(async () => {
    const res = await fetchSeriesList();
    setSeries(res.series);
    setNote(res.ok ? res.note || `Source ${res.source ?? "unknown"} — EURC/USDC only` : res.note);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    return series.filter((s) => {
      const st = seriesStatus(s, nowSec);
      if (status !== "all" && st !== status) return false;
      if (strikeFilter.trim()) {
        try {
          if (displayedStrike(BigInt(s.strikePerUnit6)) !== displayedStrike(BigInt(strikeFilter.trim()))) {
            return false;
          }
        } catch {
          return true;
        }
      }
      return true;
    });
  }, [series, status, strikeFilter, nowSec]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <header>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.75rem" }}>Markets</h1>
        <p style={{ margin: "8px 0 0", color: tokens.muted }}>
          Premiums are USDC/option; strike is USDC/EURC. Missing quotes stay unavailable — never zero.
        </p>
      </header>
      <p style={{ margin: 0, fontSize: 13, color: tokens.muted }}>{note}</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} style={{ padding: 8 }}>
            <option value="all">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="trading">Trading</option>
            <option value="exercise">Exercise</option>
            <option value="matured">Matured</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          Strike raw
          <input
            value={strikeFilter}
            onChange={(e) => setStrikeFilter(e.target.value)}
            placeholder="e.g. 110"
            style={{ padding: 8, border: `1px solid ${tokens.border}`, borderRadius: 8 }}
          />
        </label>
      </div>
      {rows.length === 0 ? (
        <p style={{ margin: 0 }}>No listed series for these filters.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", color: tokens.muted }}>
                <th style={th}>Pair</th>
                <th style={th}>Strike</th>
                <th style={th}>Exercise</th>
                <th style={th}>Status</th>
                <th style={th} />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const st = seriesStatus(s, nowSec);
                return (
                  <tr key={s.seriesId} style={{ borderTop: `1px solid ${tokens.border}` }}>
                    <td style={td}>EURC put / USDC</td>
                    <td style={td}>{displayedStrike(BigInt(s.strikePerUnit6))}</td>
                    <td style={td}>
                      {s.exerciseStart}→{s.exerciseEnd}
                    </td>
                    <td style={td}>{st}</td>
                    <td style={td}>
                      <Link href={`/markets/${s.seriesId}`}>Open</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function MarketDetail({ seriesId }: { seriesId: string }) {
  const { address } = useAccount();
  const [series, setSeries] = useState<SeriesCard | null>(null);
  const [note, setNote] = useState("");
  const [tab, setTab] = useState<"terms" | "trade" | "history" | "liquidity" | "contracts">("trade");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [qty, setQty] = useState("100");
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nowSec = BigInt(Math.floor(Date.now() / 1000));

  useEffect(() => {
    void (async () => {
      const res = await fetchSeriesList();
      setNote(res.note);
      setSeries(res.series.find((s) => s.seriesId.toLowerCase() === seriesId.toLowerCase()) ?? null);
    })();
  }, [seriesId]);

  const phase = series
    ? phaseAt(nowSec, BigInt(series.tradingStart), BigInt(series.exerciseStart), BigInt(series.exerciseEnd))
    : null;

  async function onQuote() {
    if (!series || !address) {
      setError("Connect wallet to bind quote account");
      return;
    }
    let units: bigint;
    try {
      units = parseWholeOptions(qty);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    const res = await fetchQuote({
      seriesId: series.seriesId,
      side,
      optionUnits: units.toString(),
      account: address,
    });
    if (!res.ok) {
      setQuote(null);
      setError(res.message);
      return;
    }
    setQuote(res.quote);
    setError(null);
  }

  if (!series) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <Link href="/markets">← Markets</Link>
        <p>{note || "Series not found"}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Link href="/markets">← Markets</Link>
      <header>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>
          EURC put @ {displayedStrike(BigInt(series.strikePerUnit6))}
        </h1>
        <p style={{ margin: "8px 0 0", color: tokens.muted, fontSize: 14 }}>
          Phase: {phase}. Soft UI buffers never extend onchain cutoff.
        </p>
      </header>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(
          [
            ["trade", "Trade"],
            ["terms", "Terms"],
            ["history", "History"],
            ["liquidity", "Liquidity"],
            ["contracts", "Contracts"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: `1px solid ${tab === id ? tokens.action : tokens.border}`,
              background: tab === id ? tokens.softHighlight : "#fff",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "trade" ? (
        <section style={{ display: "grid", gap: 12, maxWidth: 480 }}>
          {phase !== "trading" ? (
            <p style={{ margin: 0 }}>
              Trading closed ({phase}).{" "}
              {phase === "exercise" ? <Link href="/portfolio">Exercise in Portfolio</Link> : null}
            </p>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setSide("buy")} style={{ fontWeight: side === "buy" ? 700 : 500 }}>
                  Buy exact-output
                </button>
                <button type="button" onClick={() => setSide("sell")} style={{ fontWeight: side === "sell" ? 700 : 500 }}>
                  Sell exact-input
                </button>
              </div>
              <input value={qty} onChange={(e) => setQty(e.target.value)} style={{ padding: 12, borderRadius: 12, border: `1px solid ${tokens.border}` }} />
              <button type="button" onClick={() => void onQuote()} style={{ padding: "10px 14px", borderRadius: 12, background: tokens.action, color: "#fff", border: "none", fontWeight: 600 }}>
                Fetch size-specific quote
              </button>
              {error ? <p role="alert" style={{ color: tokens.critical, margin: 0 }}>{error}</p> : null}
              {quote ? (
                <div style={{ fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
                  <p style={{ margin: 0 }}>
                    {quote.side} {formatRaw6(BigInt(quote.optionUnits))} →{" "}
                    {formatAmount(BigInt(quote.expectedUSDC6), "USDC")}
                    {quote.maxUSDC6 ? ` · max ${formatAmount(BigInt(quote.maxUSDC6), "USDC")}` : ""}
                    {quote.minUSDC6 ? ` · min ${formatAmount(BigInt(quote.minUSDC6), "USDC")}` : ""}
                  </p>
                  <p style={{ margin: "8px 0 0", color: tokens.muted, fontSize: 12 }}>
                    Mid is not executable. Source {quote.provenance.source}. Executable {String(quote.executable)}.
                  </p>
                  <button type="button" disabled={!quote.executable} style={{ marginTop: 8, opacity: quote.executable ? 1 : 0.5 }}>
                    {quote.executable ? "Continue" : "No liquidity / not executable"}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {tab === "terms" ? (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
          <li>Physical delivery EURC→USDC on exercise</li>
          <li>Multiplier 100 EURC / whole option</li>
          <li>Strike {displayedStrike(BigInt(series.strikePerUnit6))} USDC/EURC</li>
          <li>
            Trading {series.tradingStart} → exercise {series.exerciseStart} → {series.exerciseEnd}
          </li>
        </ul>
      ) : null}

      {tab === "history" ? (
        <p style={{ margin: 0, fontSize: 14 }}>
          Sparse indexed swaps only — no EURC-spot candles. Empty volume preferred over invented depth.
        </p>
      ) : null}

      {tab === "liquidity" ? (
        <p style={{ margin: 0, fontSize: 14 }}>
          Advanced LP UI is O22. This tab does not fake PositionManager controls. <Link href="/earn">Earn</Link>
        </p>
      ) : null}

      {tab === "contracts" ? (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, wordBreak: "break-all" }}>
          <li>seriesId: {series.seriesId}</li>
          <li>vault: {series.vault}</li>
          <li>long: {series.longToken}</li>
          <li>receipt: {series.writerReceipt}</li>
          <li>Pairband-deployed v4 path ≠ official Uniswap Arc listing</li>
        </ul>
      ) : null}
    </div>
  );
}
