import { EarnWriterFlow } from "../../../components/earn/EarnWriterFlow";
import { RiskNotice } from "../../../components/RiskNotice";

export default function EarnPage() {
  return (
    <div style={{ display: "grid", gap: 32 }}>
      <EarnWriterFlow />
      <RiskNotice />
    </div>
  );
}
