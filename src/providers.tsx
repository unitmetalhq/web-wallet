import * as React from "react";
import { mainnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, WagmiProvider, http } from "wagmi";
// --- Theme ---
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { Provider as JotaiProvider } from 'jotai'

const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(import.meta.env.VITE_MAINNET_RPC_URL),
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <JotaiProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </JotaiProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}