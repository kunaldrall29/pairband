"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { ARC_TESTNET_CHAIN } from "@pairband/ui";

const arcTestnet = {
  id: ARC_TESTNET_CHAIN.id,
  name: ARC_TESTNET_CHAIN.name,
  nativeCurrency: ARC_TESTNET_CHAIN.nativeCurrency,
  rpcUrls: {
    default: { http: [...ARC_TESTNET_CHAIN.rpcUrls.default.http] },
  },
  blockExplorers: {
    default: {
      name: ARC_TESTNET_CHAIN.blockExplorers.default.name,
      url: ARC_TESTNET_CHAIN.blockExplorers.default.url,
    },
  },
  testnet: true,
} as const;

const config = createConfig({
  chains: [arcTestnet],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(arcTestnet.rpcUrls.default.http[0]),
  },
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
