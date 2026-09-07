"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { ARC_TESTNET_CHAIN, networkBadgeStyle } from "@pairband/ui";

export function WalletMenu({ mode: _mode }: { mode: "preview" | "testnet" | "mainnet" }) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();

  const wrongNetwork = Boolean(isConnected && chainId && chainId !== ARC_TESTNET_CHAIN.id);
  const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];

  if (!isConnected) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={() => injected && connect({ connector: injected })}
          disabled={!injected || isPending}
          title="Browse without connecting. Connect only to exercise wallet UI states — preview never enables financial actions."
          style={{
            border: "1px solid var(--pb-border, #D7DFDA)",
            background: "var(--pb-action, #087F75)",
            color: "#fff",
            borderRadius: 12,
            padding: "8px 14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {isPending ? "Connecting…" : "Connect wallet"}
        </button>
        {error ? (
          <span role="status" style={{ color: "var(--pb-critical, #B42318)", fontSize: 12 }}>
            {error.message.includes("User rejected") ? "Connection rejected — try again" : "Wallet error"}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {wrongNetwork ? (
        <span style={networkBadgeStyle({ mode, wrongNetwork: true })}>Wrong network</span>
      ) : null}
      {wrongNetwork ? (
        <button
          type="button"
          onClick={() => switchChain?.({ chainId: ARC_TESTNET_CHAIN.id })}
          disabled={switching}
          style={{
            borderRadius: 12,
            border: "1px solid var(--pb-border, #D7DFDA)",
            padding: "8px 12px",
            background: "#fff",
            fontWeight: 600,
          }}
        >
          Switch to Arc Testnet
        </button>
      ) : null}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          fontVariantNumeric: "tabular-nums",
        }}
        title={address}
      >
        {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ""}
      </span>
      <button
        type="button"
        onClick={() => disconnect()}
        style={{
          borderRadius: 12,
          border: "1px solid var(--pb-border, #D7DFDA)",
          padding: "8px 12px",
          background: "#fff",
        }}
      >
        Disconnect
      </button>
    </div>
  );
}
