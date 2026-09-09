"use client";

import { useCallback, useMemo, useState } from "react";
import { useAccount, usePublicClient, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { isAddressLike, validateMemo } from "@pairband/domain";
import { ACTIVE_CHAIN } from "@pairband/config";
import { fetchQuote, formatUnits, parseUnits, postReceipt, type QuoteResponse } from "@/lib/api";
import { prepareSameAssetUsdcPay } from "@/lib/pay-tx";

type Phase =
  | "form"
  | "review"
  | "signing"
  | "confirming"
  | "settled"
  | "cancelled"
  | "refused"
  | "network"
  | "failed";

export function PayForm({
  initialPayee,
  orgId,
}: {
  initialPayee?: string;
  orgId?: string;
} = {}) {
  const { address, isConnected, chainId } = useAccount();
  const [payee, setPayee] = useState(initialPayee ?? "");
  const [amount, setAmount] = useState("100");
  const [currency, setCurrency] = useState<"USDC" | "EURC">("USDC");
  const [reference, setReference] = useState("INV-1042");
  const [bandBps, setBandBps] = useState(String(ACTIVE_CHAIN.defaultBandBps));
  const [phase, setPhase] = useState<Phase>("form");
  const [refuseMsg, setRefuseMsg] = useState("");
  const [quote, setQuote] = useState<Extract<QuoteResponse, { executable: true }> | null>(null);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [memoId, setMemoId] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient();
  const wait = useWaitForTransactionReceipt({ hash: txHash });

  const eurcHidden = !ACTIVE_CHAIN.eurcRoutesEnabled;

  const amountOut = useMemo(() => {
    try {
      return parseUnits(amount, 6);
    } catch {
      return null;
    }
  }, [amount]);

  const onPreview = useCallback(async () => {
    setError("");
    setRefuseMsg("");
    if (!isAddressLike(payee)) {
      setError("Enter a valid payee address.");
      return;
    }
    const memo = validateMemo(reference);
    if (!memo.ok) {
      setError(memo.error);
      return;
    }
    if (amountOut == null || amountOut <= 0n) {
      setError("Enter a positive amount.");
      return;
    }
    if (currency === "EURC" && eurcHidden) {
      setPhase("refused");
      setRefuseMsg("This pair is not listed");
      return;
    }
    try {
      const q = await fetchQuote({
        tokenIn: currency === "USDC" ? "USDC" : "EURC",
        tokenOut: currency,
        amountOut: amountOut.toString(),
        bandBps: Number(bandBps) || ACTIVE_CHAIN.defaultBandBps,
        payee,
        reference,
      });
      if (!q.executable) {
        setPhase("refused");
        setRefuseMsg(q.message);
        setQuote(null);
        return;
      }
      setQuote(q);
      setPhase("review");
    } catch {
      setPhase("network");
      setRefuseMsg("Network unavailable");
    }
  }, [amountOut, bandBps, currency, eurcHidden, payee, reference]);

  const onSend = useCallback(async () => {
    if (!quote || !isConnected || !address) return;
    if (chainId !== ACTIVE_CHAIN.chainId) {
      setError("Switch to Arc testnet first.");
      return;
    }
    if (Date.now() >= quote.expiresAt) {
      setPhase("refused");
      setRefuseMsg("Refresh price");
      return;
    }
    setPhase("signing");
    setError("");
    try {
      const prepared = prepareSameAssetUsdcPay({
        payee: payee as `0x${string}`,
        amount: BigInt(quote.amountOut),
        reference,
      });
      setMemoId(prepared.memoId);
      const hash = await sendTransactionAsync({
        to: prepared.to,
        data: prepared.data,
        gas: prepared.gas,
      });
      setTxHash(hash);
      setPhase("confirming");
      if (!publicClient) throw new Error("RPC unavailable");
      const inclusion = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
      if (inclusion.status !== "success") {
        await postReceipt({
          txHash: hash,
          payee: payee as `0x${string}`,
          payer: address,
          orgId,
          quoteId: quote.quoteId,
          tokenOut: "USDC",
          tokenIn: "USDC",
          amountOut: quote.amountOut,
          amountIn: quote.amountIn,
          reference,
          memoId: prepared.memoId,
          status: "failed",
          chainId: ACTIVE_CHAIN.chainId,
        });
        setPhase("failed");
        setError("Transaction reverted on Arc.");
        return;
      }
      const row = await postReceipt({
        txHash: hash,
        payee: payee as `0x${string}`,
        payer: address,
        orgId,
        quoteId: quote.quoteId,
        tokenOut: "USDC",
        tokenIn: "USDC",
        amountOut: quote.amountOut,
        amountIn: quote.amountIn,
        reference,
        memoId: prepared.memoId,
        status: "settled",
        chainId: ACTIVE_CHAIN.chainId,
      });
      setReceiptId(row.id);
      setPhase(row.status === "settled" ? "settled" : "failed");
      if (row.status !== "settled") {
        setError("Onchain verify rejected settled status.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "cancelled";
      if (/user rejected|denied|rejected/i.test(msg)) {
        setPhase("cancelled");
      } else if (/unauthorized|sign in/i.test(msg)) {
        setError("Sign in on Workspace before recording a receipt, or payment may have already left the wallet.");
        setPhase("failed");
      } else {
        setError(msg);
        setPhase("failed");
      }
    }
  }, [address, chainId, isConnected, orgId, payee, publicClient, quote, reference, sendTransactionAsync]);

  if (phase === "settled" && quote) {
    return (
      <ReceiptCard
        title="Payment settled"
        amountOut={formatUnits(quote.amountOut, 6)}
        payee={payee}
        reference={reference}
        txHash={txHash}
        memoId={memoId}
        receiptId={receiptId}
        status="settled"
        waitStatus={wait.status}
      />
    );
  }

  if (phase === "refused") {
    return (
      <StateCard
        title={refuseMsg || "No executable route"}
        body="Nothing left the wallet. A preview is not a fill. No wallet prompt was shown for a refused band."
        onReset={() => {
          setPhase("form");
          setRefuseMsg("");
        }}
      />
    );
  }

  if (phase === "cancelled") {
    return (
      <StateCard title="Cancelled" body="Wallet rejected the signature. No retry without a new quote." onReset={() => setPhase("form")} />
    );
  }

  if (phase === "network" || phase === "failed") {
    return (
      <StateCard
        title={phase === "network" ? "Network unavailable" : "Payment failed"}
        body={error || "Do not mark settled. Check RPC and try again with a fresh quote."}
        onReset={() => setPhase("form")}
      />
    );
  }

  if (phase === "review" && quote) {
    return (
      <div className="card" style={{ padding: "1.5rem" }}>
        <h1 style={{ marginTop: 0, fontFamily: "var(--font-display)", fontSize: "1.75rem" }}>Review</h1>
        <dl style={{ display: "grid", gap: 12 }}>
          <Row label="Payee" value={payee} />
          <Row label="They receive" value={`${formatUnits(quote.amountOut, 6)} USDC`} />
          <Row label="You spend" value={`${formatUnits(quote.amountIn, 6)} USDC`} />
          <Row label="Fee" value="0 (same-asset)" />
          <Row label="Reference" value={reference} />
          <Row label="Route" value="Memo.memo → USDC transfer (one tx)" />
        </dl>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button className="btn btn-secondary" type="button" onClick={() => setPhase("form")}>
            Back
          </button>
          <button className="btn btn-primary" type="button" disabled={!isConnected} onClick={onSend}>
            {!isConnected ? "Connect wallet to send" : "Send"}
          </button>
        </div>
        {error ? (
          <p style={{ color: "var(--danger)" }} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (phase === "signing" || phase === "confirming") {
    return (
      <div className="card" style={{ padding: "1.5rem" }}>
        <h1 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>
          {phase === "signing" ? "Confirm in wallet" : "Waiting for finality"}
        </h1>
        <p className="muted">One transaction: Arc Memo wraps the USDC transfer. Pending is never settled.</p>
        {txHash ? (
          <p style={{ fontSize: "0.9rem" }}>
            <a href={`${ACTIVE_CHAIN.explorerUrl}/tx/${txHash}`} target="_blank" rel="noreferrer">
              {txHash.slice(0, 12)}…
            </a>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <h1 style={{ marginTop: 0, fontFamily: "var(--font-display)", fontSize: "1.85rem" }}>Pay</h1>
      <p className="muted" style={{ marginTop: "-0.35rem" }}>
        Exact-out to a payee. If the band cannot be filled, nothing leaves the wallet.
      </p>
      <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
        <Field label="Payee address">
          <input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="0x…" style={inputStyle} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 8rem", gap: 10 }}>
          <Field label="They receive">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Currency">
            <select value={currency} onChange={(e) => setCurrency(e.target.value as "USDC" | "EURC")} style={inputStyle}>
              <option value="USDC">USDC</option>
              {!eurcHidden ? <option value="EURC">EURC</option> : null}
            </select>
          </Field>
        </div>
        {eurcHidden ? (
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            EURC is hidden until a listed pool can fill inside the band.
          </p>
        ) : null}
        <Field label="Reference (onchain memo)">
          <input value={reference} onChange={(e) => setReference(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Price band (bps vs mid)">
          <input
            value={bandBps}
            onChange={(e) => setBandBps(e.target.value)}
            disabled={currency === "USDC"}
            style={inputStyle}
          />
        </Field>
        {currency === "USDC" ? (
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Same-asset pay: band n/a · fee 0 · single Memo-wrapped transfer.
          </p>
        ) : null}
        {error ? (
          <p style={{ color: "var(--danger)", margin: 0 }} role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn btn-primary" type="button" onClick={onPreview}>
          Review
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "8rem 1fr", gap: 8 }}>
      <dt className="muted">{label}</dt>
      <dd style={{ margin: 0, fontWeight: 600, wordBreak: "break-all" }}>{value}</dd>
    </div>
  );
}

function StateCard({ title, body, onReset }: { title: string; body: string; onReset: () => void }) {
  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <h1 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>{title}</h1>
      <p className="muted">{body}</p>
      <button className="btn btn-primary" type="button" onClick={onReset}>
        Back to Pay
      </button>
    </div>
  );
}

function ReceiptCard(props: {
  title: string;
  amountOut: string;
  payee: string;
  reference: string;
  txHash?: `0x${string}`;
  memoId: string | null;
  receiptId: string | null;
  status: string;
  waitStatus: string;
}) {
  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <h1 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>{props.title}</h1>
      <dl style={{ display: "grid", gap: 12 }}>
        <Row label="Amount received" value={`${props.amountOut} USDC`} />
        <Row label="Payee" value={props.payee} />
        <Row label="Reference" value={props.reference} />
        <Row label="Memo id" value={props.memoId ?? "—"} />
        <Row label="Status" value={props.status} />
        <Row label="Inclusion" value={props.waitStatus} />
        {props.txHash ? <Row label="Explorer" value={`${ACTIVE_CHAIN.explorerUrl}/tx/${props.txHash}`} /> : null}
      </dl>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <a className="btn btn-primary" href="/app/activity">
          Activity
        </a>
        {props.receiptId ? (
          <a className="btn btn-secondary" href={`/app/receipt/${props.receiptId}`}>
            Receipt
          </a>
        ) : null}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "0.75rem 0.9rem",
  background: "#fffdf8",
};
