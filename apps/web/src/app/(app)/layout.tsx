import { AppShell } from "../../components/AppShell";
import { Providers } from "../../providers/Providers";

const mode = (process.env.NEXT_PUBLIC_PAIRBAND_MODE ?? "preview") as
  | "preview"
  | "testnet"
  | "mainnet";

/** App routes load wagmi; public landing does not. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AppShell mode={mode}>{children}</AppShell>
    </Providers>
  );
}
