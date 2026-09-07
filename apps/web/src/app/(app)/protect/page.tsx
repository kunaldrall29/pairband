import { ProtectPurchaseFlow } from "../../../components/protect/ProtectPurchaseFlow";
import { RiskNotice } from "../../../components/RiskNotice";

export default function ProtectPage() {
  return (
    <div style={{ display: "grid", gap: 32 }}>
      <ProtectPurchaseFlow />
      <RiskNotice />
    </div>
  );
}
