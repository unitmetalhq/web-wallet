import * as React from "react";
import { mainnet, arbitrum, base, unichain, arbitrumSepolia, sepolia, baseSepolia, unichainSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, WagmiProvider, http } from "wagmi";
import { ThemeProvider } from "@/components/theme-provider";
import { Provider as JotaiProvider } from 'jotai'

const config = createConfig({
  chains: [mainnet, base, arbitrum, unichain, sepolia, baseSepolia, arbitrumSepolia, unichainSepolia],
  transports: {
    [mainnet.id]: http(import.meta.env.VITE_MAINNET_RPC_URL),
    [base.id]: http(import.meta.env.VITE_BASE_RPC_URL),
    [arbitrum.id]: http(import.meta.env.VITE_ARBITRUM_RPC_URL),
    [unichain.id]: http(import.meta.env.VITE_UNICHAIN_RPC_URL),
    [sepolia.id]: http(import.meta.env.VITE_SEPOLIA_RPC_URL),
    [baseSepolia.id]: http(import.meta.env.VITE_BASE_SEPOLIA_RPC_URL),
    [arbitrumSepolia.id]: http(import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL),
    [unichainSepolia.id]: http(import.meta.env.VITE_UNICHAIN_SEPOLIA_RPC_URL),
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      defaultTheme="system"
      storageKey="vite-ui-theme"
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