import { tokens } from "@pairband/ui";

export function DataFreshness({
  source,
  stale,
  observedAt,
}: {
  source: "rpc" | "indexer" | "fixture";
  stale?: boolean;
  observedAt?: string;
}) {
  return (
    <p
      role="status"
      style={{
        margin: 0,
        fontSize: 13,
        color: stale ? tokens.warning : tokens.muted,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      Data source: {source}
      {observedAt ? ` · observed ${observedAt}` : " · no live observation"}
      {stale ? " · stale — refresh before acting" : ""}
      {source === "fixture" ? " · illustrative only" : ""}
    </p>
  );
}
