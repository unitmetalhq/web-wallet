"use client";

import * as React from "react";
import { mainnet, arbitrum, base, unichain } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, WagmiProvider, http } from "wagmi";
import { ThemeProvider } from "@/components/theme-provider";

const config = createConfig({
  chains: [mainnet, base, arbitrum, unichain],
  transports: {
    [mainnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL_ETHEREUM!),
    [base.id]: http(process.env.NEXT_PUBLIC_RPC_URL_BASE!),
    [arbitrum.id]: http(process.env.NEXT_PUBLIC_RPC_URL_ARBITRUM!),
    [unichain.id]: http(process.env.NEXT_PUBLIC_RPC_URL_UNICHAIN!),
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
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}