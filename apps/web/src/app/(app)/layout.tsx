import { AppShell } from "../../components/AppShell";

const mode = (process.env.NEXT_PUBLIC_PAIRBAND_MODE ?? "preview") as
  | "preview"
  | "testnet"
  | "mainnet";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell mode={mode}>{children}</AppShell>;
}
