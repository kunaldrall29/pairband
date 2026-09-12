"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { http, createConfig, WagmiProvider } from "wagmi";
import { injected } from "wagmi/connectors";
import { ACTIVE_CHAIN } from "@pairband/config";
import { BrowserWalletInstall } from "./browser-wallet-install";

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

/**
 * Injected wallet only (window.ethereum).
 * For demos set NEXT_PUBLIC_BROWSER_WALLET=1 to install the Arc rehearsal provider
 * that shows a connect prompt with the full payer address.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [config] = useState(() =>
    createConfig({
      chains: [arcTestnet],
      connectors: [injected({ shimDisconnect: true, unstable_shimAsyncInject: 2_000 })],
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
      <QueryClientProvider client={queryClient}>
        <BrowserWalletInstall />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
