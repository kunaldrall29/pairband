import { RoutePlaceholder } from "../../../components/RoutePlaceholder";
import { TransactionProgress } from "../../../components/TransactionProgress";
import { AmountInputDemo } from "../../../components/AmountInputDemo";
import { DataFreshness } from "../../../components/DataFreshness";
import { RiskNotice } from "../../../components/RiskNotice";

export default function ProtectPage() {
  return (
    <div style={{ display: "grid", gap: 32 }}>
      <RoutePlaceholder
        title="Protect"
        purpose="Buy the right to exchange EURC for USDC at a fixed rate during an exercise window. Functional purchase flow arrives after quote APIs (O13/O18)."
      />
      <AmountInputDemo />
      <DataFreshness source="fixture" stale />
      <RiskNotice />
      <TransactionProgress />
    </div>
  );
}
