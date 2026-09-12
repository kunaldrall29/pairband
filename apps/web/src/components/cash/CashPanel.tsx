"use client";

import { useEffect, useState } from "react";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import { ACTIVE_CHAIN } from "@pairband/config";

export function CashPanel() {
  const { address, isConnected } = useAccount();
  const [rpcDown, setRpcDown] = useState(false);

  const usdc = useReadContract({
    address: ACTIVE_CHAIN.tokens.USDC.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const eurc = useReadContract({
    address: ACTIVE_CHAIN.tokens.EURC.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) && ACTIVE_CHAIN.eurcRoutesEnabled },
  });

  // Native gas is also USDC on Arc — show separately, never sum into one "APY" figure.
  const native = useBalance({
    address,
    query: { enabled: Boolean(address) },
  });

  useEffect(() => {
    setRpcDown(Boolean(usdc.isError || native.isError));
  }, [usdc.isError, native.isError]);

  if (!isConnected) {
    return (
      <div className="card" style={{ padding: "1.5rem" }}>
        <h1 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>Cash</h1>
        <p className="muted">Connect a wallet to see spendable balances. Pairband does not hold funds.</p>
      </div>
    );
  }

  if (rpcDown) {
    return (
      <div className="card" style={{ padding: "1.5rem" }}>
        <h1 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>Network unavailable</h1>
        <p className="muted">RPC failed. Do not treat cash as zero.</p>
      </div>
    );
  }

  const usdcBal = usdc.data != null ? formatUnits(usdc.data, 6) : "—";
  const spendable = usdc.isLoading ? "…" : Number(usdcBal).toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <h1 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>Cash</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        One spendable figure. Listed currencies under it. Not a yield number.
      </p>
      <div style={{ margin: "1rem 0 0" }}>
        <div className="muted" style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.04em" }}>
          WALLET ADDRESS
        </div>
        <code
          style={{
            display: "block",
            marginTop: 6,
            wordBreak: "break-all",
            fontSize: "0.9rem",
            fontWeight: 600,
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "0.65rem 0.8rem",
          }}
        >
          {address}
        </code>
      </div>
      <div style={{ marginTop: "1.5rem" }}>
        <div className="muted" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
          Spendable USDC
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.2rem, 5vw, 3rem)",
            fontWeight: 550,
            letterSpacing: "-0.03em",
            marginTop: 4,
          }}
        >
          {spendable}
        </div>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "1.5rem 0 0", display: "grid", gap: 10 }}>
        <li style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          <span>USDC</span>
          <span style={{ fontWeight: 600 }}>{usdc.isLoading ? "…" : usdcBal}</span>
        </li>
        {ACTIVE_CHAIN.eurcRoutesEnabled ? (
          <li style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
            <span>EURC</span>
            <span style={{ fontWeight: 600 }}>
              {eurc.isLoading || eurc.data == null ? "…" : formatUnits(eurc.data, 6)}
            </span>
          </li>
        ) : (
          <li className="muted" style={{ borderTop: "1px solid var(--border)", paddingTop: 10, fontSize: "0.9rem" }}>
            EURC hidden — no listed pool depth yet.
          </li>
        )}
        <li className="muted" style={{ borderTop: "1px solid var(--border)", paddingTop: 10, fontSize: "0.85rem" }}>
          Native gas (USDC system token):{" "}
          {native.isLoading || !native.data ? "…" : Number(native.data.formatted).toFixed(6)}
        </li>
      </ul>
      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        <a className="btn btn-primary" href="/app/pay">
          Pay
        </a>
        <a className="btn btn-secondary" href="/app/convert">
          Convert
        </a>
      </div>
    </div>
  );
}
