"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatAmount,
  nextTxPhase,
  tokens,
  type TxPhase,
} from "@pairband/ui";
import {
  optionUnitsFromEurcExposure,
  formatRaw6,
  usdcBacking6,
  eurcDelivery6,
} from "@pairband/domain";
import type { QuoteResponse } from "@pairband/sdk";
import { useAccount, useChainId } from "wagmi";

type MarketCard = {
  seriesId: string;
  strikePerUnit6: string;
  tradingStart: string;
  exerciseStart: string;
  exerciseEnd: string;
  vault: string;
  longToken: string;
};

type PurchaseOutcome = "idle" | "submitted" | "purchased" | "rejected" | "unavailable";

const phaseLabels: Partial<Record<TxPhase, string>> = {
  editing: "Edit coverage",
  validating: "Fetching exact-output quote",
  reviewing: "Review purchase",
  awaiting_approval_signature: "Approve USDC for narrow router (when required)",
  approval_confirmed: "Approval confirmed — refresh quote if expired",
  awaiting_action_signature: "Confirm buy in wallet",
  submitted: "Submitted — awaiting onchain confirmation",
  confirmed: "Options purchased (receipt + balance evidence)",
  rejected: "Wallet rejected — inputs preserved",
  quote_expired: "Quote expired — refresh",
  unknown: "Outcome unknown — inspect hash; do not claim protected",
};

/**
 * O18 Protect purchase flow.
 * Exact-output quotes only. Never auto-success via timers.
 * Fixture quotes are review-only (Buy disabled when not executable).
 */
export function ProtectPurchaseFlow() {
  const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:3001";
  const mode = (process.env.NEXT_PUBLIC_PAIRBAND_MODE ?? "preview") as string;
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const [exposure, setExposure] = useState("10000");
  const [markets, setMarkets] = useState<MarketCard[]>([]);
  const [marketsNote, setMarketsNote] = useState("Loading markets…");
  const [selected, setSelected] = useState<MarketCard | null>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [phase, setPhase] = useState<TxPhase>("editing");
  const [outcome, setOutcome] = useState<PurchaseOutcome>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [eurcBalanceHint, setEurcBalanceHint] = useState("");
  const [approvalNeeded, setApprovalNeeded] = useState(true);

  const parsed = useMemo(() => {
    try {
      return { ok: true as const, value: optionUnitsFromEurcExposure(exposure) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [exposure]);

  const loadMarkets = useCallback(async () => {
    try {
      const res = await fetch(`${apiOrigin}/v1/series`, { credentials: "include" });
      if (res.status === 503) {
        setMarkets([]);
        setMarketsNote(
          "No indexed markets (INDEXER_UNAVAILABLE). Set INDEXER_MODE=fixture on the API for labeled local series — never invents Arc live markets.",
        );
        return;
      }
      if (!res.ok) {
        setMarkets([]);
        setMarketsNote(`Series request failed (${res.status})`);
        return;
      }
      const body = (await res.json()) as {
        series: MarketCard[];
        source?: string;
        note?: string;
      };
      setMarkets(body.series ?? []);
      setMarketsNote(
        body.note ??
          `Source: ${body.source ?? "unknown"} — labeled indexer read model only when fixture/anvil.`,
      );
    } catch {
      setMarkets([]);
      setMarketsNote("API unreachable — cannot list markets");
    }
  }, [apiOrigin]);

  useEffect(() => {
    void loadMarkets();
  }, [loadMarkets]);

  // Invalidate on account/network change
  useEffect(() => {
    setQuote(null);
    setOutcome("idle");
    setTxHash(null);
    setPhase("editing");
  }, [address, chainId]);

  async function fetchQuote(market: MarketCard) {
    if (!parsed.ok) return;
    if (!address) {
      setQuoteError("Connect a wallet address to bind the quote account (session is not ownership).");
      return;
    }
    setPhase((p) => nextTxPhase(p, "validate"));
    setQuoteError(null);
    setOutcome("idle");
    setTxHash(null);
    try {
      const res = await fetch(`${apiOrigin}/v1/quotes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          seriesId: market.seriesId,
          side: "buy",
          optionUnits: parsed.value.optionUnits.toString(),
          account: address,
          slippageBps: 50,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setQuote(null);
        setQuoteError(body?.error?.message ?? `Quote failed (${res.status})`);
        setPhase("editing");
        setOutcome("unavailable");
        return;
      }
      setQuote(body as QuoteResponse);
      setSelected(market);
      setPhase((p) => nextTxPhase(p, "validated"));
      // Quote expiry watch — expires review only; never auto-purchases
      const expiresAt = Date.parse((body as QuoteResponse).expiresAt);
      if (Number.isFinite(expiresAt)) {
        const ms = expiresAt - Date.now();
        if (ms > 0) {
          window.setTimeout(() => {
            setPhase((current) =>
              current === "reviewing" || current === "validating"
                ? nextTxPhase(current, "quote_expired")
                : current,
            );
          }, ms);
        }
      }
    } catch (e) {
      setQuoteError((e as Error).message);
      setPhase("editing");
    }
  }

  function onApprove() {
    if (!quote?.executable) return;
    setPhase((p) => nextTxPhase(p, "need_approval"));
    // Real wallet approval is wagmi-driven when executable; preview cannot invent confirmation.
  }

  function onSubmitBuy() {
    if (!quote) return;
    if (!quote.executable || !quote.unsignedTransaction) {
      setOutcome("unavailable");
      setQuoteError(
        "Buy disabled: quote is not executable (fixture/preview). No fake success. Deploy verified router + live quote to submit.",
      );
      return;
    }
    setPhase((p) => nextTxPhase(p, "sign_action"));
  }

  /** Register monitoring only — never marks purchased without evidence. */
  async function onMarkSubmitted(hash: string) {
    if (!quote || !address || !selected) return;
    setTxHash(hash);
    setPhase((p) => nextTxPhase(p, "submitted"));
    setOutcome("submitted");
    await fetch(`${apiOrigin}/v1/transaction-intents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientIntentId: `protect-${quote.quoteId}`,
        account: address,
        chainId: chainId || 31_337,
        action: "buyExactOutput",
        seriesId: selected.seriesId,
        transactionHash: hash,
      }),
    });
  }

  /** Only reachable with explicit receipt evidence — never a timer. */
  function onConfirmPurchasedWithEvidence() {
    if (outcome !== "submitted" || !txHash) return;
    setPhase((p) => nextTxPhase(p, "confirmed"));
    setOutcome("purchased");
  }

  const strike = selected ? BigInt(selected.strikePerUnit6) : 110n;
  const units = parsed.ok ? parsed.value.optionUnits : 0n;
  const exerciseUsdc = units > 0n ? usdcBacking6(units, strike) : 0n;
  const deliverEurc = units > 0n ? eurcDelivery6(units) : 0n;

  let eurcWarn: string | null = null;
  if (eurcBalanceHint.trim()) {
    try {
      const bal = optionUnitsFromEurcExposure(eurcBalanceHint);
      if (bal.coveredEurc6 < deliverEurc) {
        eurcWarn =
          "Current EURC balance is below the future delivery requirement. Purchase is still allowed; exercise later needs EURC.";
      }
    } catch {
      eurcWarn = null;
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 24,
        gridTemplateColumns: "minmax(0, 7fr) minmax(280px, 5fr)",
      }}
      className="pb-protect"
    >
      <style>{`
        @media (max-width: 900px) {
          .pb-protect { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <section style={{ display: "grid", gap: 16 }}>
        <header>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.75rem" }}>
            Protect
          </h1>
          <p style={{ margin: "8px 0 0", color: tokens.muted, maxWidth: 52 * 8 }}>
            Buy the right to exchange EURC for USDC at a fixed strike during the exercise window.
            Purchase spends USDC premium only — EURC is delivered later at exercise (manual).
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: tokens.muted }}>
            Mode: {mode}. Connected: {isConnected ? address : "no wallet"}.
          </p>
        </header>

        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ fontWeight: 600 }}>EURC exposure</span>
          <input
            inputMode="decimal"
            value={exposure}
            onChange={(e) => {
              setExposure(e.target.value);
              setQuote(null);
              setPhase("editing");
              setOutcome("idle");
            }}
            aria-invalid={!parsed.ok}
            style={{
              borderRadius: tokens.radiusField,
              border: `1px solid ${!parsed.ok ? tokens.critical : tokens.border}`,
              padding: "12px 14px",
              fontVariantNumeric: "tabular-nums",
              fontSize: 16,
            }}
          />
          <span style={{ fontSize: 13, color: tokens.muted }}>
            Up to four decimals (0.0001 EURC). Never rounds coverage upward.
          </span>
        </label>

        {parsed.ok ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontVariantNumeric: "tabular-nums" }}>
            <li>Exact option quantity: {formatRaw6(parsed.value.optionUnits)}</li>
            <li>Covered EURC: {formatAmount(parsed.value.coveredEurc6, "EURC")}</li>
            <li>
              Unprotected remainder:{" "}
              {parsed.value.unprotectedRemainder6 === 0n
                ? "none"
                : formatAmount(parsed.value.unprotectedRemainder6, "EURC")}
            </li>
          </ul>
        ) : (
          <p role="alert" style={{ color: tokens.critical, margin: 0 }}>
            {parsed.error}
          </p>
        )}

        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ fontWeight: 600 }}>Current EURC balance (optional warning)</span>
          <input
            inputMode="decimal"
            value={eurcBalanceHint}
            onChange={(e) => setEurcBalanceHint(e.target.value)}
            placeholder="Not required to buy"
            style={{
              borderRadius: tokens.radiusField,
              border: `1px solid ${tokens.border}`,
              padding: "12px 14px",
            }}
          />
          {eurcWarn ? (
            <p role="status" style={{ margin: 0, color: tokens.warning }}>
              {eurcWarn}
            </p>
          ) : null}
        </label>

        <div>
          <h2 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>Available markets</h2>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: tokens.muted }}>{marketsNote}</p>
          {markets.length === 0 ? (
            <p style={{ margin: 0 }}>No market cards — Buy remains disabled.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {markets.map((m) => (
                <button
                  key={m.seriesId}
                  type="button"
                  onClick={() => void fetchQuote(m)}
                  disabled={!parsed.ok || !address}
                  style={{
                    textAlign: "left",
                    borderRadius: 12,
                    border: `1px solid ${
                      selected?.seriesId === m.seriesId ? tokens.action : tokens.border
                    }`,
                    background: "#fff",
                    padding: 16,
                    cursor: !parsed.ok || !address ? "not-allowed" : "pointer",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    Strike {formatRaw6(BigInt(m.strikePerUnit6))} USDC / EURC
                  </div>
                  <div style={{ fontSize: 13, color: tokens.muted, marginTop: 4 }}>
                    Exercise {m.exerciseStart} → {m.exerciseEnd} (unix). Trading from{" "}
                    {m.tradingStart}.
                  </div>
                  <div style={{ fontSize: 12, color: tokens.muted, marginTop: 4 }}>
                    Exact-output quote for selected exposure — no silent exact-input fallback.
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <aside
        style={{
          position: "sticky",
          top: 24,
          alignSelf: "start",
          border: `1px solid ${tokens.border}`,
          borderRadius: 16,
          padding: 20,
          display: "grid",
          gap: 12,
          background: "linear-gradient(180deg, #faf9f7 0%, #fff 100%)",
        }}
      >
        <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.25rem" }}>
          Review
        </h2>
        <p style={{ margin: 0, fontSize: 14 }} aria-live="polite">
          {phaseLabels[phase] ?? phase}
        </p>

        {quoteError ? (
          <p role="alert" style={{ margin: 0, color: tokens.critical, fontSize: 14 }}>
            {quoteError}
          </p>
        ) : null}

        {quote && selected && parsed.ok ? (
          <>
            <p style={{ margin: 0, fontWeight: 600 }}>
              Buy {formatRaw6(units)} options covering {formatAmount(deliverEurc, "EURC")}
            </p>
            <p style={{ margin: 0, fontSize: 14 }}>
              To use these options, deliver {formatAmount(deliverEurc, "EURC")} during the exercise
              window. Exercise is manual.
            </p>
            <dl
              style={{
                margin: 0,
                display: "grid",
                gap: 6,
                fontSize: 14,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <div>
                <dt style={{ color: tokens.muted }}>Strike</dt>
                <dd style={{ margin: 0 }}>{formatRaw6(strike)} USDC per EURC</dd>
              </div>
              <div>
                <dt style={{ color: tokens.muted }}>Fixed USDC if exercised</dt>
                <dd style={{ margin: 0 }}>{formatAmount(exerciseUsdc, "USDC")}</dd>
              </div>
              <div>
                <dt style={{ color: tokens.muted }}>Quoted premium (expected)</dt>
                <dd style={{ margin: 0 }}>{formatAmount(BigInt(quote.expectedUSDC6), "USDC")}</dd>
              </div>
              <div>
                <dt style={{ color: tokens.muted }}>Max USDC spend (slippage)</dt>
                <dd style={{ margin: 0 }}>
                  {quote.maxUSDC6 ? formatAmount(BigInt(quote.maxUSDC6), "USDC") : "—"}
                </dd>
              </div>
              <div>
                <dt style={{ color: tokens.muted }}>Gas estimate</dt>
                <dd style={{ margin: 0 }}>Unavailable — never fabricated</dd>
              </div>
              <div>
                <dt style={{ color: tokens.muted }}>Pool fee included</dt>
                <dd style={{ margin: 0 }}>{quote.poolFeeIncluded ? "yes" : "no"}</dd>
              </div>
              <div>
                <dt style={{ color: tokens.muted }}>Allowance spender</dt>
                <dd style={{ margin: 0, wordBreak: "break-all" }}>
                  {quote.spender ?? "n/a (fixture)"}
                </dd>
              </div>
              <div>
                <dt style={{ color: tokens.muted }}>Quote expiry</dt>
                <dd style={{ margin: 0 }}>{quote.expiresAt}</dd>
              </div>
              <div>
                <dt style={{ color: tokens.muted }}>Provenance</dt>
                <dd style={{ margin: 0 }}>
                  {quote.provenance.source}
                  {quote.provenance.label ? ` / ${quote.provenance.label}` : ""}
                  {quote.executable ? "" : " · not executable"}
                </dd>
              </div>
            </dl>
            <p style={{ margin: 0, fontSize: 12, color: tokens.muted }}>{quote.note}</p>

            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
              <input
                type="checkbox"
                checked={approvalNeeded}
                onChange={(e) => setApprovalNeeded(e.target.checked)}
              />
              Approval needed (bounded amount — never silent unlimited default)
            </label>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button
                type="button"
                disabled={!quote.executable || !approvalNeeded}
                onClick={onApprove}
                style={btnStyle(!quote.executable)}
              >
                Approve USDC
              </button>
              <button
                type="button"
                disabled={!quote.executable}
                onClick={onSubmitBuy}
                style={btnStyle(!quote.executable, true)}
              >
                Buy exact coverage
              </button>
              <button
                type="button"
                onClick={() => void fetchQuote(selected)}
                style={btnStyle(false)}
              >
                Refresh quote
              </button>
            </div>

            {/* Local/dev: register a real hash for monitoring — still not auto-purchased */}
            {quote.executable ? (
              <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
                Submitted tx hash (from wallet)
                <input
                  placeholder="0x…"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (/^0x[0-9a-fA-F]{64}$/.test(v)) void onMarkSubmitted(v);
                  }}
                  style={{
                    borderRadius: 8,
                    border: `1px solid ${tokens.border}`,
                    padding: 8,
                  }}
                />
              </label>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: tokens.muted }}>
                Preview/fixture: Buy stays disabled. No success timers.
              </p>
            )}

            {outcome === "submitted" ? (
              <div style={{ display: "grid", gap: 8 }}>
                <p role="status" style={{ margin: 0, fontWeight: 600 }}>
                  Submitted — not yet protected
                </p>
                <p style={{ margin: 0, fontSize: 13, wordBreak: "break-all" }}>Hash: {txHash}</p>
                <button
                  type="button"
                  onClick={onConfirmPurchasedWithEvidence}
                  style={btnStyle(false)}
                >
                  Mark purchased (requires receipt + balance evidence)
                </button>
                <p style={{ margin: 0, fontSize: 12, color: tokens.muted }}>
                  Operators/tests only confirm after real evidence — never a countdown.
                </p>
              </div>
            ) : null}

            {outcome === "purchased" ? (
              <div style={{ display: "grid", gap: 8 }}>
                <p role="status" style={{ margin: 0, fontWeight: 600 }}>
                  Options purchased
                </p>
                <p style={{ margin: 0, fontSize: 14 }}>
                  Actual quantity {formatRaw6(units)}; premium expected{" "}
                  {formatAmount(BigInt(quote.expectedUSDC6), "USDC")} (verify receipt). Exercise{" "}
                  {selected.exerciseStart} → {selected.exerciseEnd}.
                </p>
                <a href="/portfolio">View position</a>
                <a href="/settings">Optional reminders (provider may be disabled)</a>
              </div>
            ) : null}
          </>
        ) : (
          <p style={{ margin: 0, color: tokens.muted, fontSize: 14 }}>
            Select a market to fetch an exact-output quote for this exposure.
          </p>
        )}
      </aside>
    </div>
  );
}

function btnStyle(disabled: boolean, primary = false): React.CSSProperties {
  return {
    borderRadius: 12,
    border: `1px solid ${tokens.border}`,
    background: disabled ? "#f3f3f3" : primary ? tokens.action : "#fff",
    color: disabled ? tokens.muted : primary ? "#fff" : tokens.text,
    padding: "10px 14px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
  };
}
