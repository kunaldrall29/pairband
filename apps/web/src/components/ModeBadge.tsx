import { networkBadgeLabel, networkBadgeStyle } from "@pairband/ui";

export function ModeBadge({ mode }: { mode: "preview" | "testnet" | "mainnet" }) {
  return (
    <span role="status" data-mode={mode} style={networkBadgeStyle({ mode })}>
      {networkBadgeLabel({ mode })}
    </span>
  );
}
