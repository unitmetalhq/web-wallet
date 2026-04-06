import * as React from "react";
import { mainnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { createConfig, WagmiProvider, http } from "wagmi";
import { ThemeProvider } from "@/components/theme-provider.tsx";
import { Provider as JotaiProvider, useAtomValue } from "jotai";
import { offlineModeAtom, SETTINGS_KEY } from "@/atoms/settingsAtom";
import type { WalletSettings } from "@/types/setting";

// ── RPC resolution ────────────────────────────────────────────────────────────
// Read custom RPC synchronously from localStorage at module-init time so that
// createConfig (which runs once, outside React) picks it up on every page load.
function getInitialRpcUrl(): string {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const settings = JSON.parse(stored) as WalletSettings;
      if (settings.activeRpc?.chainId === mainnet.id && settings.activeRpc.url) {
        return settings.activeRpc.url;
      }
    }
  } catch {
    // ignore parse errors
  }
  return import.meta.env.VITE_MAINNET_RPC_URL as string;
}

const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(getInitialRpcUrl()),
  },
});

const queryClient = new QueryClient();

// ── OfflineModeSync ───────────────────────────────────────────────────────────
// Sits inside the React tree. When offline mode is toggled it cancels all
// in-flight queries and pauses background refetching so no new network
// requests are issued for cached data.
function OfflineModeSync() {
  const offlineMode = useAtomValue(offlineModeAtom);
  const qc = useQueryClient();

  React.useEffect(() => {
    if (offlineMode) {
      qc.cancelQueries();
      qc.setDefaultOptions({
        queries: {
          refetchOnMount: false,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
          staleTime: Infinity,
          retry: false,
        },
      });
    } else {
      qc.setDefaultOptions({ queries: {} });
    }
  }, [offlineMode, qc]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <JotaiProvider>
          <ThemeProvider>
            <OfflineModeSync />
            {children}
          </ThemeProvider>
        </JotaiProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
