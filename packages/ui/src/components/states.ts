import type { CSSProperties } from "react";
import { tokens } from "../tokens.js";

export type NetworkBadgeProps = {
  mode: "preview" | "testnet" | "mainnet";
  chainId?: number | null;
  wrongNetwork?: boolean;
};

export function networkBadgeLabel(props: NetworkBadgeProps): string {
  if (props.wrongNetwork) return "Wrong network";
  if (props.mode === "preview") return "Product preview";
  if (props.mode === "testnet") return "Arc Testnet · Test tokens only";
  return "Limited mainnet pilot";
}

export function networkBadgeStyle(props: NetworkBadgeProps): CSSProperties {
  const warning = props.wrongNetwork || props.mode === "testnet";
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 12px",
    borderRadius: tokens.radiusBadge,
    border: `1px solid ${tokens.border}`,
    background: warning ? "#FFF6E8" : tokens.softHighlight,
    color: props.wrongNetwork ? tokens.critical : tokens.text,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.02em",
  };
}

export type EmptyStateProps = {
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
};

export function emptyStateCopy(kind: "positions" | "markets" | "activity"): EmptyStateProps {
  if (kind === "positions") {
    return {
      title: "No positions yet",
      body: "Browse markets or protect an EURC exposure. Balances are never fabricated.",
      actionLabel: "Explore markets",
      actionHref: "/markets",
    };
  }
  if (kind === "markets") {
    return {
      title: "No markets listed",
      body: "Live series appear after the indexer is online. Preview mode does not invent quotes.",
      actionLabel: "How it works",
      actionHref: "/",
    };
  }
  return {
    title: "No activity",
    body: "Confirmed onchain events will show here. Quotes are not recorded as fills.",
  };
}
