"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatAmount, tokens } from "@pairband/ui";
import {
  exerciseObligations,
  formatRaw6,
  parseWholeOptions,
  phaseAt,
  redeemPayout,
  displayedStrike,
} from "@pairband/domain";
import { useAccount } from "wagmi";
import { fetchWalletPositions } from "../../lib/pairband-api";

type Tab = "longs" | "receipts" | "liquidity";
type LongRow = {
  kind: string;
  seriesId: string;
  token: string;
  rawAmount: string;
  costBasis: string;
  vault?: string;
  strikePerUnit6?: string;
  exerciseStart?: string;
  exerciseEnd?: string;
};
type ReceiptRow = {
  kind: string;
  seriesId: string;
  token: string;
  rawAmount: string;
  costBasis: string;
  note?: string;
};

const inputStyle: React.CSSProperties = {
  borderRadius: 10,
  border: `1px solid ${tokens.border}`,
  padding: "8px 10px",
  fontVariantNumeric: "tabular-nums",
};

function btn(primary = false): React.CSSProperties {
  return {
    borderRadius: 12,
    border: `1px solid ${tokens.border}`,
    background: primary ? tokens.action : "#fff",
    color: primary ? "#fff" : tokens.text,
    padding: "10px 14px",
    fontWeight: 600,
    width: "fit-content",
  };
}

export function PortfolioHoldings() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>("longs");
  const [note, setNote] = useState("");
  const [longs, setLongs] = useState<LongRow[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [liquidity, setLiquidity] = useState<unknown[]>([]);
  const [selectedLong, setSelectedLong] = useState<LongRow | null>(null);
  const [exUnits, setExUnits] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [redeemUnits, setRedeemUnits] = useState("");
  const [snapshotUsdc, setSnapshotUsdc] = useState("6600000000");
  const [snapshotEurc, setSnapshotEurc] = useState("4000000000");
  const [writerW0, setWriterW0] = useState("100000000");
  const [redeemedSoFar, setRedeemedSoFar] = useState("0");
  const [manualLong, setManualLong] = useState("");
  const nowSec = BigInt(Math.floor(Date.now() / 1000));

  const load = useCallback(async () => {
    if (!address) {
      setNote("Connect a wallet to load positions (session ≠ ownership).");
      setLongs([]);
      setReceipts([]);
      return;
    }
    const res = await fetchWalletPositions(address);
    setNote(res.note);
    setLongs(res.longs as LongRow[]);
    setReceipts(res.receipts as ReceiptRow[]);
    setLiquidity(res.liquidity);
  }, [address]);

  useEffect(() => {
    void load();
  }, [load]);

  const exercisePreview = useMemo(() => {
    if (!selectedLong?.strikePerUnit6) return null;
    try {
      const q = parseWholeOptions(exUnits || "0");
      const bal = BigInt(selectedLong.rawAmount);
      if (q <= 0n || q > bal) return { error: "Units must be within long balance" };
      return { error: null as string | null, q, ...exerciseObligations(q, BigInt(selectedLong.strikePerUnit6)) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [exUnits, selectedLong]);

  const redeemPreview = useMemo(() => {
    try {
      const q = parseWholeOptions(redeemUnits || "0");
      if (q <= 0n) return null;
      return redeemPayout(BigInt(writerW0), BigInt(snapshotUsdc), BigInt(snapshotEurc), BigInt(redeemedSoFar), q);
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [redeemUnits, writerW0, snapshotUsdc, snapshotEurc, redeemedSoFar]);

  function phaseFor(row: LongRow) {
    if (!row.exerciseStart || !row.exerciseEnd) return "unknown";
    const es = BigInt(row.exerciseStart);
    const ee = BigInt(row.exerciseEnd);
    try {
      return phaseAt(nowSec, es > 0n ? es - 1n : 0n, es, ee);
    } catch {
      return "unknown";
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <header>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.75rem" }}>Portfolio</h1>
        <p style={{ margin: "8px 0 0", color: tokens.muted }}>
          Longs, writer receipts, and LP stay separate — never summed into one portfolio value.
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: tokens.muted }}>
          {isConnected ? address : "No wallet"} · {note}
        </p>
      </header>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(
          [
            ["longs", "Options you own"],
            ["receipts", "Writer receipts"],
            ["liquidity", "Liquidity positions"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: `1px solid ${tab === id ? tokens.action : tokens.border}`,
              background: tab === id ? tokens.softHighlight : "#fff",
              fontWeight: 600,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "longs" ? (
        <section style={{ display: "grid", gap: 16 }}>
          {longs.length === 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ margin: 0 }}>No long balances from indexer for this address.</p>
              <label style={{ display: "grid", gap: 4, fontSize: 13, maxWidth: 360 }}>
                Manual long units (review math only)
                <input value={manualLong} onChange={(e) => setManualLong(e.target.value)} style={inputStyle} />
              </label>
              <button
                type="button"
                style={btn()}
                onClick={() => {
                  try {
                    const raw = parseWholeOptions(manualLong || "0").toString();
                    setSelectedLong({
                      kind: "long",
                      seriesId: `0x${"11".repeat(32)}`,
                      token: `0x${"33".repeat(20)}`,
                      rawAmount: raw,
                      costBasis: "unknown",
                      strikePerUnit6: "110",
                      exerciseStart: String(Math.floor(Date.now() / 1000) - 100),
                      exerciseEnd: String(Math.floor(Date.now() / 1000) + 86400),
                      vault: `0x${"22".repeat(20)}`,
                    });
                    setExUnits(formatRaw6(BigInt(raw)));
                    setActionMsg("Manual review row — not onchain inventory.");
                  } catch (e) {
                    setActionMsg((e as Error).message);
                  }
                }}
              >
                Load review row
              </button>
            </div>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
              {longs.map((row) => (
                <li key={`${row.seriesId}-${row.token}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLong(row);
                      setExUnits(formatRaw6(BigInt(row.rawAmount)));
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: 14,
                      borderRadius: 12,
                      border: `1px solid ${tokens.border}`,
                      background: "#fff",
                    }}
                  >
                    {formatRaw6(BigInt(row.rawAmount))} options · {row.costBasis} · {phaseFor(row)}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selectedLong ? (
            <aside style={{ border: `1px solid ${tokens.border}`, borderRadius: 16, padding: 16, display: "grid", gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Exercise ticket</h2>
              <p style={{ margin: 0, fontSize: 14 }}>
                Strike{" "}
                {selectedLong.strikePerUnit6
                  ? displayedStrike(BigInt(selectedLong.strikePerUnit6))
                  : "—"}
                . Reference mark must not block exercise. Phase: {phaseFor(selectedLong)}.
              </p>
              <label style={{ display: "grid", gap: 4 }}>
                Units (partial allowed)
                <input value={exUnits} onChange={(e) => setExUnits(e.target.value)} style={inputStyle} />
              </label>
              {exercisePreview && exercisePreview.error ? (
                <p role="alert" style={{ margin: 0, color: tokens.critical }}>
                  {exercisePreview.error}
                </p>
              ) : exercisePreview && "eurcIn6" in exercisePreview ? (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
                  <li>Burn: {formatRaw6(exercisePreview.q)}</li>
                  <li>EURC in: {formatAmount(exercisePreview.eurcIn6, "EURC")}</li>
                  <li>USDC out: {formatAmount(exercisePreview.usdcOut6, "USDC")}</li>
                  <li>Gas: unavailable — never fabricated</li>
                </ul>
              ) : null}
              <button
                type="button"
                style={btn(true)}
                onClick={() =>
                  setActionMsg("Exercise prepare blocked in preview without verified vault. No fake success.")
                }
              >
                Prepare exercise
              </button>
              <Link href="/settings">Reminders (opt-in; provider may be disabled)</Link>
            </aside>
          ) : null}
        </section>
      ) : null}

      {tab === "receipts" ? (
        <section style={{ display: "grid", gap: 16 }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            Receipts pool outcomes. Transferred receipts keep reserve rights, not prior premium. Writer
            claims do not expire.
          </p>
          {receipts.length === 0 ? (
            <p style={{ margin: 0 }}>No receipts indexed for this address.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
              {receipts.map((r) => (
                <li key={r.token}>
                  {formatRaw6(BigInt(r.rawAmount))} · {r.costBasis}
                  {r.note ? ` — ${r.note}` : ""}
                </li>
              ))}
            </ul>
          )}
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Redeem after maturity</h2>
          <p style={{ margin: 0, fontSize: 13, color: tokens.muted }}>
            Fixed snapshot + cumulative-allocation rounding — not “withdraw original USDC” after
            assignment.
          </p>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))" }}>
            <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
              W0
              <input value={writerW0} onChange={(e) => setWriterW0(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
              U0
              <input value={snapshotUsdc} onChange={(e) => setSnapshotUsdc(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
              E0
              <input value={snapshotEurc} onChange={(e) => setSnapshotEurc(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
              Redeemed
              <input value={redeemedSoFar} onChange={(e) => setRedeemedSoFar(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
              Claim
              <input value={redeemUnits} onChange={(e) => setRedeemUnits(e.target.value)} style={inputStyle} />
            </label>
          </div>
          {redeemPreview && "error" in redeemPreview ? (
            <p role="alert" style={{ color: tokens.critical, margin: 0 }}>
              {redeemPreview.error}
            </p>
          ) : redeemPreview && "usdc6" in redeemPreview ? (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
              <li>USDC out: {formatAmount(redeemPreview.usdc6, "USDC")}</li>
              <li>EURC out: {formatAmount(redeemPreview.eurc6, "EURC")}</li>
              <li>Next R: {redeemPreview.nextR.toString()}</li>
            </ul>
          ) : null}
          <button
            type="button"
            style={btn(true)}
            onClick={() =>
              setActionMsg("Redeem prepare blocked in preview without verified vault + maturity.")
            }
          >
            Prepare redeem
          </button>
        </section>
      ) : null}

      {tab === "liquidity" ? (
        <p style={{ margin: 0, fontSize: 14 }}>
          LP NFTs: {liquidity.length === 0 ? "none indexed" : String(liquidity.length)}. Vault backing
          ≠ LP free balance. Advanced controls → O22.
        </p>
      ) : null}

      <section style={{ borderTop: `1px solid ${tokens.border}`, paddingTop: 16, fontSize: 13, color: tokens.muted }}>
        <h2 style={{ margin: "0 0 8px", fontSize: "1rem", color: tokens.text }}>Direct-contract recovery</h2>
        <p style={{ margin: 0 }}>
          If API/worker is down, exercise/redeem remain available via verified vault ABIs. Admins cannot
          seize claims or change strike/times.
        </p>
        {actionMsg ? (
          <p role="status" style={{ margin: "12px 0 0", color: tokens.warning }}>
            {actionMsg}
          </p>
        ) : null}
      </section>
    </div>
  );
}
