"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ReactNode } from "react";
import { coreTestnet } from "@/config/chains";

const config = getDefaultConfig({
  appName: "Breevs",
  projectId: "process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID",
  chains: [coreTestnet],
  ssr: true,
});

const queryClient = new QueryClient();

export default function ConnectWallet({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
