"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatAmount, nextTxPhase, tokens, type TxPhase } from "@pairband/ui";
import {
  parseWholeOptions,
  formatRaw6,
  mintObligations,
  displayedStrike,
  ILLUSTRATIVE_WRITER_LOSS,
} from "@pairband/domain";
import type { QuoteResponse } from "@pairband/sdk";
import { useAccount, useChainId } from "wagmi";
import { fetchQuote, fetchSeriesList, type SeriesCard } from "../../lib/pairband-api";

type Stage = "terms" | "mint" | "sell";
type MintOutcome = "idle" | "submitted" | "minted" | "unavailable";

const inputStyle: React.CSSProperties = {
  borderRadius: tokens.radiusField,
  border: `1px solid ${tokens.border}`,
  padding: "12px 14px",
  fontVariantNumeric: "tabular-nums",
};

function btn(disabled: boolean, primary = false): React.CSSProperties {
  return {
    borderRadius: 12,
    border: `1px solid ${tokens.border}`,
    background: disabled ? "#f3f3f3" : primary ? tokens.action : "#fff",
    color: disabled ? tokens.muted : primary ? "#fff" : tokens.text,
    padding: "10px 14px",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

export function EarnWriterFlow() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [stage, setStage] = useState<Stage>("terms");
  const [seriesList, setSeriesList] = useState<SeriesCard[]>([]);
  const [note, setNote] = useState("Loading series…");
  const [selected, setSelected] = useState<SeriesCard | null>(null);
  const [qtyInput, setQtyInput] = useState("100");
  const [feeBps, setFeeBps] = useState(0);
  const [phase, setPhase] = useState<TxPhase>("editing");
  const [mintOutcome, setMintOutcome] = useState<MintOutcome>("idle");
  const [mintHash, setMintHash] = useState<string | null>(null);
  const [longBalance, setLongBalance] = useState(0n);
  const [receiptBalance, setReceiptBalance] = useState(0n);
  const [sellQuote, setSellQuote] = useState<QuoteResponse | null>(null);
  const [sellError, setSellError] = useState<string | null>(null);
  const [sellUnits, setSellUnits] = useState("");
  const [cancelUnits, setCancelUnits] = useState("");

  const load = useCallback(async () => {
    const res = await fetchSeriesList();
    setSeriesList(res.series);
    setNote(res.note || (res.ok ? "Series loaded" : "No series"));
    if (res.series[0] && !selected) setSelected(res.series[0]);
  }, [selected]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSellQuote(null);
    setMintOutcome("idle");
    setPhase("editing");
  }, [address, chainId]);

  const parsedQty = useMemo(() => {
    try {
      return { ok: true as const, units: parseWholeOptions(qtyInput) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [qtyInput]);

  const strike = selected ? BigInt(selected.strikePerUnit6) : 110n;
  const obligations = parsedQty.ok ? mintObligations(parsedQty.units, strike, feeBps) : null;
  const ex = ILLUSTRATIVE_WRITER_LOSS;

  const matchedCancel = useMemo(() => {
    try {
      const q = parseWholeOptions(cancelUnits || "0");
      const max = longBalance < receiptBalance ? longBalance : receiptBalance;
      return { enabled: q > 0n && q <= max };
    } catch {
      return { enabled: false };
    }
  }, [cancelUnits, longBalance, receiptBalance]);

  async function onFetchSellQuote() {
    if (!selected || !address) return;
    let units: bigint;
    try {
      units = parseWholeOptions(sellUnits || "0");
    } catch (e) {
      setSellError((e as Error).message);
      return;
    }
    if (longBalance > 0n && units > longBalance) {
      setSellError("Sell quantity exceeds unsold long balance");
      return;
    }
    const res = await fetchQuote({
      seriesId: selected.seriesId,
      side: "sell",
      optionUnits: units.toString(),
      account: address,
    });
    if (!res.ok) {
      setSellQuote(null);
      setSellError(res.message);
      return;
    }
    setSellQuote(res.quote);
    setSellError(null);
    setPhase("reviewing");
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.75rem" }}>
          Write EURC options with USDC backing
        </h1>
        <p style={{ margin: "8px 0 0", color: tokens.muted, maxWidth: 640 }}>
          Lock the full exercise amount, receive option tokens and writer receipts, then sell options
          for premium in a <strong>separate</strong> transaction. Minting alone does not earn premium.
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: tokens.muted }}>
          Stages: Choose terms → Mint backed options → Sell options. Wallet:{" "}
          {isConnected ? address : "disconnected"}.
        </p>
      </header>

      <nav aria-label="Earn stages" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(
          [
            ["terms", "1. Choose terms"],
            ["mint", "2. Mint backed options"],
            ["sell", "3. Sell options"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setStage(id)}
            style={{
              borderRadius: 999,
              border: `1px solid ${stage === id ? tokens.action : tokens.border}`,
              background: stage === id ? tokens.softHighlight : "#fff",
              padding: "8px 14px",
              fontWeight: 600,
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      <aside
        style={{
          border: `1px solid ${tokens.border}`,
          borderRadius: 16,
          padding: 16,
          background: "#fff",
          display: "grid",
          gap: 8,
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Writer downside (illustrative)</h2>
        <p style={{ margin: 0, fontSize: 14 }}>
          Example: {ex.backingUsdc.toString()} USDC backing, {ex.premiumReceivedUsdc.toString()} USDC
          premium, all exercised at EURC mark {ex.spotUsdcPerEurc} → illustrative loss{" "}
          {ex.illustrativeLossUsdc.toString()} USDC before other costs.
        </p>
        <p style={{ margin: 0, fontSize: 12, color: tokens.muted }}>
          {ex.note} Receipts pool outcomes; premiums are not transferred with receipts. No APY /
          auto-compound / public writer vault shares.
        </p>
      </aside>

      {stage === "terms" ? (
        <section style={{ display: "grid", gap: 16, maxWidth: 560 }}>
          <p style={{ margin: 0, fontSize: 13, color: tokens.muted }}>{note}</p>
          {seriesList.length === 0 ? (
            <p>No series — set INDEXER_MODE=fixture on API for labeled local markets.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {seriesList.map((s) => (
                <button
                  key={s.seriesId}
                  type="button"
                  onClick={() => setSelected(s)}
                  style={{
                    textAlign: "left",
                    padding: 14,
                    borderRadius: 12,
                    border: `1px solid ${
                      selected?.seriesId === s.seriesId ? tokens.action : tokens.border
                    }`,
                    background: "#fff",
                  }}
                >
                  Strike {displayedStrike(BigInt(s.strikePerUnit6))} USDC/EURC · exercise{" "}
                  {s.exerciseStart}→{s.exerciseEnd}
                </button>
              ))}
            </div>
          )}
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Option quantity</span>
            <input value={qtyInput} onChange={(e) => setQtyInput(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Issuance fee bps (0 is honest for zero-fee)</span>
            <input
              type="number"
              min={0}
              max={50}
              value={feeBps}
              onChange={(e) => setFeeBps(Number(e.target.value) || 0)}
              style={inputStyle}
            />
          </label>
          {parsedQty.ok && obligations ? (
            <ul style={{ margin: 0, paddingLeft: 18, fontVariantNumeric: "tabular-nums" }}>
              <li>Raw units: {formatRaw6(parsedQty.units)}</li>
              <li>Locked USDC backing: {formatAmount(obligations.collateral6, "USDC")}</li>
              <li>Issuance fee (separate): {formatAmount(obligations.fee6, "USDC")}</li>
              <li>Total before gas: {formatAmount(obligations.totalDebitBeforeGas6, "USDC")}</li>
              <li>Gas reserve: unavailable — never fabricated</li>
            </ul>
          ) : !parsedQty.ok ? (
            <p role="alert" style={{ color: tokens.critical, margin: 0 }}>
              {parsedQty.error}
            </p>
          ) : null}
          <button
            type="button"
            disabled={!parsedQty.ok || !selected}
            onClick={() => {
              setStage("mint");
              setPhase("reviewing");
            }}
            style={btn(!parsedQty.ok || !selected, true)}
          >
            Continue to mint review
          </button>
        </section>
      ) : null}

      {stage === "mint" ? (
        <section style={{ display: "grid", gap: 12, maxWidth: 560 }}>
          <h2 style={{ margin: 0 }}>Mint review</h2>
          <p style={{ margin: 0, fontSize: 14 }}>
            You receive <strong>two claims</strong>: long tokens and writer receipts. This is not
            “earn premium”. Phase: {phase}.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                setMintOutcome("unavailable");
                setSellError(
                  "Mint submit requires verified vault + wallet simulation. Preview cannot invent a mint receipt.",
                );
              }}
              style={btn(false, true)}
            >
              Mint backed options
            </button>
            <button type="button" onClick={() => setStage("terms")} style={btn(false)}>
              Back
            </button>
          </div>
          {mintOutcome === "unavailable" && sellError ? (
            <p role="status" style={{ margin: 0, color: tokens.warning }}>
              {sellError}
            </p>
          ) : null}
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            Optional mint tx hash
            <input
              placeholder="0x…"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (/^0x[0-9a-fA-F]{64}$/.test(v)) {
                  setMintHash(v);
                  setPhase((p) => nextTxPhase(p, "submitted"));
                  setMintOutcome("submitted");
                }
              }}
              style={inputStyle}
            />
          </label>
          {mintOutcome === "submitted" ? (
            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Submitted — not yet minted</p>
              <button
                type="button"
                onClick={() => {
                  if (!parsedQty.ok || !mintHash) return;
                  setPhase((p) => nextTxPhase(p, "confirmed"));
                  setMintOutcome("minted");
                  setLongBalance(parsedQty.units);
                  setReceiptBalance(parsedQty.units);
                  setStage("sell");
                  setSellUnits(formatRaw6(parsedQty.units));
                }}
                style={btn(false)}
              >
                Confirm minted (receipt + balance evidence)
              </button>
            </div>
          ) : null}
          {mintOutcome === "minted" ? (
            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Backed options minted</p>
              <p style={{ margin: 0, fontSize: 14 }}>
                Long {formatRaw6(longBalance)}; receipt {formatRaw6(receiptBalance)}. Vault backing
                is not LP inventory.
              </p>
              <button type="button" onClick={() => setStage("sell")} style={btn(false, true)}>
                Review sale quote
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {stage === "sell" ? (
        <section style={{ display: "grid", gap: 16, maxWidth: 560 }}>
          <h2 style={{ margin: 0 }}>Sell options (exact-input)</h2>
          <p style={{ margin: 0, fontSize: 14, color: tokens.muted }}>
            Unsold longs {formatRaw6(longBalance)}; receipts {formatRaw6(receiptBalance)}. Quotes are
            not guaranteed across the mint/sell gap.
          </p>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Sell quantity</span>
            <input value={sellUnits} onChange={(e) => setSellUnits(e.target.value)} style={inputStyle} />
          </label>
          <button type="button" onClick={() => void onFetchSellQuote()} style={btn(false, true)}>
            Fetch exact-input sale quote
          </button>
          {sellError ? (
            <p role="alert" style={{ margin: 0, color: tokens.critical }}>
              {sellError}
            </p>
          ) : null}
          {sellQuote ? (
            <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
              <p style={{ margin: 0 }}>
                Expected {formatAmount(BigInt(sellQuote.expectedUSDC6), "USDC")}
                {sellQuote.minUSDC6
                  ? `; min ${formatAmount(BigInt(sellQuote.minUSDC6), "USDC")}`
                  : ""}{" "}
                · {sellQuote.executable ? "executable" : "not executable"}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: tokens.muted }}>{sellQuote.note}</p>
              <button type="button" disabled={!sellQuote.executable} style={btn(!sellQuote.executable, true)}>
                Sell (disabled until executable)
              </button>
              {!sellQuote.executable ? (
                <p style={{ margin: 0, fontWeight: 600 }}>Options minted; no executable sale quote</p>
              ) : null}
            </div>
          ) : null}
          <div style={{ borderTop: `1px solid ${tokens.border}`, paddingTop: 16 }}>
            <h3 style={{ margin: "0 0 8px" }}>Hold / advanced LP / cancel</h3>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
              <li>Hold unsold longs</li>
              <li>Advanced liquidity arrives in O22 — not faked here</li>
              <li>Cancel matched long+receipt before cutoff (fee not refunded)</li>
            </ul>
            <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
              <span style={{ fontWeight: 600 }}>Cancel matched units</span>
              <input value={cancelUnits} onChange={(e) => setCancelUnits(e.target.value)} style={inputStyle} />
            </label>
            <button
              type="button"
              disabled={!matchedCancel.enabled}
              style={btn(!matchedCancel.enabled)}
              onClick={() =>
                setSellError(
                  "Cancel requires verified vault prepare + both balances. Preview cannot fake cancel.",
                )
              }
            >
              Cancel matched claims
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
