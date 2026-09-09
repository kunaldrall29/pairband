"use client";

import { useCallback, useMemo, useState } from "react";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { isAddressLike, validateMemo } from "@pairband/domain";
import { ACTIVE_CHAIN } from "@pairband/config";
import { fetchQuote, formatUnits, parseUnits, postReceipt, type QuoteResponse } from "@/lib/api";
import { prepareSameAssetUsdcPay, referenceToMemoId } from "@/lib/pay-tx";

type Phase =
  | "form"
  | "review"
  | "signing"
  | "confirming"
  | "settled"
  | "incomplete"
  | "cancelled"
  | "refused"
  | "network";

export function PayForm() {
  const { address, isConnected, chainId } = useAccount();
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("100");
  const [currency, setCurrency] = useState<"USDC" | "EURC">("USDC");
  const [reference, setReference] = useState("INV-1042");
  const [bandBps, setBandBps] = useState(String(ACTIVE_CHAIN.defaultBandBps));
  const [phase, setPhase] = useState<Phase>("form");
  const [refuseMsg, setRefuseMsg] = useState("");
  const [quote, setQuote] = useState<Extract<QuoteResponse, { executable: true }> | null>(null);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [memoTxHash, setMemoTxHash] = useState<`0x${string}` | undefined>();
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const { sendTransactionAsync } = useSendTransaction();
  const transferWait = useWaitForTransactionReceipt({ hash: txHash });
  const memoWait = useWaitForTransactionReceipt({ hash: memoTxHash });

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
      const steps = prepareSameAssetUsdcPay({
        payee: payee as `0x${string}`,
        amount: BigInt(quote.amountOut),
        reference,
      });
      const transferHash = await sendTransactionAsync({
        to: steps[0]!.to,
        data: steps[0]!.data,
      });
      setTxHash(transferHash);
      setPhase("confirming");
      // Wait handled by hooks; continue memo in effect-like sequence:
      let memoHash: `0x${string}` | undefined;
      if (steps[1]) {
        try {
          memoHash = await sendTransactionAsync({
            to: steps[1].to,
            data: steps[1].data,
          });
          setMemoTxHash(memoHash);
        } catch {
          const row = await postReceipt({
            txHash: transferHash,
            payee: payee as `0x${string}`,
            tokenOut: "USDC",
            tokenIn: "USDC",
            amountOut: quote.amountOut,
            amountIn: quote.amountIn,
            reference,
            memoId: null,
            status: "incomplete",
            chainId: ACTIVE_CHAIN.chainId,
          });
          setReceiptId(row.id);
          setPhase("incomplete");
          return;
        }
      }
      const row = await postReceipt({
        txHash: transferHash,
        payee: payee as `0x${string}`,
        tokenOut: "USDC",
        tokenIn: "USDC",
        amountOut: quote.amountOut,
        amountIn: quote.amountIn,
        reference,
        memoId: referenceToMemoId(reference),
        status: "settled",
        chainId: ACTIVE_CHAIN.chainId,
      });
      setReceiptId(row.id);
      setPhase("settled");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "cancelled";
      if (/user rejected|denied|rejected/i.test(msg)) {
        setPhase("cancelled");
      } else {
        setError(msg);
        setPhase("form");
      }
    }
  }, [address, chainId, isConnected, payee, quote, reference, sendTransactionAsync]);

  if (phase === "settled" && quote) {
    return (
      <ReceiptView
        title="Payment settled"
        amountOut={formatUnits(quote.amountOut, 6)}
        tokenOut="USDC"
        payee={payee}
        reference={reference}
        txHash={txHash}
        memoId={referenceToMemoId(reference)}
        receiptId={receiptId}
        status="settled"
      />
    );
  }

  if (phase === "incomplete" && quote) {
    return (
      <ReceiptView
        title="Payment incomplete"
        amountOut={formatUnits(quote.amountOut, 6)}
        tokenOut="USDC"
        payee={payee}
        reference={reference}
        txHash={txHash}
        memoId={null}
        receiptId={receiptId}
        status="incomplete"
        note="Transfer may have left the wallet; memo write failed. Do not hide leftover — recover from Activity."
      />
    );
  }

  if (phase === "refused") {
    return (
      <StateCard
        title={refuseMsg || "No executable route"}
        body="Nothing left the wallet. A preview is not a fill."
        onReset={() => {
          setPhase("form");
          setRefuseMsg("");
        }}
      />
    );
  }

  if (phase === "cancelled") {
    return (
      <StateCard
        title="Cancelled"
        body="Wallet rejected the signature. No retry without a new quote."
        onReset={() => setPhase("form")}
      />
    );
  }

  if (phase === "network") {
    return (
      <StateCard
        title="Network unavailable"
        body="Do not mark settled. Check RPC and try again."
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
          <Row label="Route" value="Direct transfer + memo" />
        </dl>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button className="btn btn-secondary" type="button" onClick={() => setPhase("form")}>
            Back
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={!isConnected || phase === ("signing" as Phase)}
            onClick={onSend}
          >
            {!isConnected ? "Connect wallet to send" : "Send"}
          </button>
        </div>
        {error ? (
          <p style={{ color: "var(--danger)", marginBottom: 0 }} role="alert">
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
        <p className="muted">
          Arc settles in under a second when the network is available. Pending is never shown as settled.
        </p>
        {txHash ? (
          <p style={{ fontSize: "0.9rem" }}>
            Transfer:{" "}
            <a href={`${ACTIVE_CHAIN.explorerUrl}/tx/${txHash}`} target="_blank" rel="noreferrer">
              {txHash.slice(0, 10)}…
            </a>{" "}
            ({transferWait.isSuccess ? "included" : "pending"})
          </p>
        ) : null}
        {memoTxHash ? (
          <p style={{ fontSize: "0.9rem" }}>
            Memo:{" "}
            <a href={`${ACTIVE_CHAIN.explorerUrl}/tx/${memoTxHash}`} target="_blank" rel="noreferrer">
              {memoTxHash.slice(0, 10)}…
            </a>{" "}
            ({memoWait.isSuccess ? "included" : "pending"})
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
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "USDC" | "EURC")}
              style={inputStyle}
            >
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
            Same-asset pay: band n/a · fee 0 · direct transfer + memo.
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

function ReceiptView(props: {
  title: string;
  amountOut: string;
  tokenOut: string;
  payee: string;
  reference: string;
  txHash?: `0x${string}`;
  memoId: string | null;
  receiptId: string | null;
  status: string;
  note?: string;
}) {
  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <h1 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>{props.title}</h1>
      <dl style={{ display: "grid", gap: 12 }}>
        <Row label="Amount received" value={`${props.amountOut} ${props.tokenOut}`} />
        <Row label="Payee" value={props.payee} />
        <Row label="Reference" value={props.reference} />
        <Row label="Memo id" value={props.memoId ?? "—"} />
        <Row label="Status" value={props.status} />
        {props.txHash ? (
          <Row label="Explorer" value={`${ACTIVE_CHAIN.explorerUrl}/tx/${props.txHash}`} />
        ) : null}
      </dl>
      {props.note ? <p className="muted">{props.note}</p> : null}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <a className="btn btn-primary" href={`/app/activity`}>
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
