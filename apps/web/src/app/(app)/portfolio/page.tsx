import { RoutePlaceholder } from "../../../components/RoutePlaceholder";
import { emptyStateCopy } from "@pairband/ui";

export default function PortfolioPage() {
  const empty = emptyStateCopy("positions");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <RoutePlaceholder
        title="Portfolio"
        purpose="Long options, writer receipts, and LP NFTs stay separate. Mark-to-market may be unavailable."
      />
      <p style={{ margin: 0, color: "var(--pb-muted)" }}>
        {empty.title}: {empty.body}
      </p>
    </div>
  );
}
