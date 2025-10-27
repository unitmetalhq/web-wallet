"use client";

import * as React from "react";
import { mainnet, arbitrum, base, unichain, arbitrumSepolia, sepolia, baseSepolia, unichainSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, WagmiProvider, http } from "wagmi";
import { ThemeProvider } from "@/components/theme-provider";
import { Provider as JotaiProvider } from 'jotai'

const config = createConfig({
  chains: [mainnet, base, arbitrum, unichain, sepolia, baseSepolia, arbitrumSepolia, unichainSepolia],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [unichain.id]: http(),
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [unichainSepolia.id]: http(),
  },
  ssr: true, // Because it is Nextjs's App router, you need to declare ssr as true
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <JotaiProvider>
            {children}
          </JotaiProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}