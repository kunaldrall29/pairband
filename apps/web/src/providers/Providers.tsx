"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { http, createConfig, WagmiProvider } from "wagmi";
import { injected } from "wagmi/connectors";
import { ACTIVE_CHAIN } from "@pairband/config";
import { demoWalletConnector } from "./demo-wallet";

const arcTestnet = {
  id: ACTIVE_CHAIN.chainId,
  name: ACTIVE_CHAIN.name,
  nativeCurrency: ACTIVE_CHAIN.nativeCurrency,
  rpcUrls: {
    default: { http: [ACTIVE_CHAIN.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: ACTIVE_CHAIN.explorerUrl },
  },
} as const;

/** Local/demo recording only. Never enable on production. */
const DEMO_WALLET = process.env.NEXT_PUBLIC_DEMO_WALLET === "1";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [config] = useState(() =>
    createConfig({
      chains: [arcTestnet],
      connectors: DEMO_WALLET ? [demoWalletConnector()] : [injected()],
      transports: {
        [arcTestnet.id]: http(ACTIVE_CHAIN.rpcUrl, {
          fetchOptions: { headers: { "User-Agent": "Pairband/1.0" } },
        }),
      },
      ssr: true,
    }),
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
