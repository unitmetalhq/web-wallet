import { useState } from "react";
import { useAtomValue } from "jotai";
import type { UmKeystore } from "@/types/wallet";
import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import { offlineModeAtom } from "@/atoms/settingsAtom";
import { useBalance, useConfig, useReadContracts } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatUnits, erc20Abi } from "viem";
import type { Address } from "viem";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Copy, Check } from "lucide-react";

type TokenListToken = {
  chainId: number;
  address: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
};

const ETH_SENTINEL = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

const CHAIN_ID = 1;

export default function Balances() {
  const config = useConfig();
  const activeWallet = useAtomValue<UmKeystore | null>(activeWalletAtom);

  const offlineMode = useAtomValue(offlineModeAtom);
  const address = activeWallet?.address as Address | undefined;
  const isQueryEnabled = !!address && !offlineMode;

  const nativeCurrency = config.chains.find((c) => c.id === CHAIN_ID)?.nativeCurrency;

  const { data: tokenList } = useQuery({
    queryKey: ["token-list"],
    queryFn: async () => {
      const res = await fetch("/token-list.json");
      if (!res.ok) throw new Error("Failed to fetch token list");
      return res.json() as Promise<{ tokens: TokenListToken[] }>;
    },
    staleTime: Infinity,
  });

  const tokens = tokenList?.tokens.filter(
    (t) => t.chainId === CHAIN_ID && t.address.toLowerCase() !== ETH_SENTINEL
  ) ?? [];

  const { data: tokenBalances, isLoading: isLoadingTokens, refetch: refetchTokens } = useReadContracts({
    contracts: tokens.map((token) => ({
      address: token.address,
      abi: erc20Abi,
      functionName: "balanceOf" as const,
      args: [address!] as [Address],
      chainId: CHAIN_ID,
    })),
    query: { enabled: isQueryEnabled && tokens.length > 0, refetchOnMount: false },
  });

  return (
    <div className="flex flex-col border-2 border-primary gap-2 pb-8">
      <div className="flex flex-row justify-between items-center bg-primary text-secondary pl-1">
        <h1 className="text-md font-bold">Balances</h1>
      </div>
      {/* Native balance */}
      <div className="flex flex-col gap-2 px-4">
        <NativeBalanceRow
          address={address}
          chainId={CHAIN_ID}
          name={nativeCurrency?.name ?? "Native"}
          symbol={nativeCurrency?.symbol ?? "—"}
          decimals={nativeCurrency?.decimals ?? 18}
          isQueryEnabled={isQueryEnabled}
        />
      </div>

      {/* ERC20 token balances */}
      {tokens.length > 0 && (
        <>
          <div className="px-4">
            <div className="border-t border-border" />
          </div>
          <div className="flex flex-col gap-4 px-4 py-2">
            {tokens.map((token, i) => {
              const raw = tokenBalances?.[i];
              const rawBalance = raw?.status === "success" ? (raw.result as bigint) : undefined;
              if (!isQueryEnabled) return null;
              if (!isLoadingTokens && (rawBalance === undefined || rawBalance === 0n)) return null;
              return (
                <BalanceRow
                  key={token.address}
                  name={token.name}
                  symbol={token.symbol}
                  address={token.address}
                  value={formatUnits(rawBalance ?? BigInt(0), token.decimals)}
                  isLoading={isQueryEnabled && isLoadingTokens}
                  isError={raw?.status === "failure"}
                  onRefresh={refetchTokens}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── NativeBalanceRow ──────────────────────────────────────────────────────────

function NativeBalanceRow({
  address,
  chainId,
  name,
  symbol,
  decimals,
  isQueryEnabled,
}: {
  address: Address | undefined;
  chainId: number;
  name: string;
  symbol: string;
  decimals: number;
  isQueryEnabled: boolean;
}) {
  const { data: balance, isLoading, isError, refetch } = useBalance({
    address,
    chainId,
    query: { enabled: isQueryEnabled, refetchOnMount: false },
  });

  return (
    <BalanceRow
      name={name}
      symbol={symbol}
      value={formatUnits(balance?.value ?? BigInt(0), decimals)}
      isLoading={isQueryEnabled && isLoading}
      isError={isQueryEnabled && isError}
      onRefresh={refetch}
    />
  );
}

// ── BalanceRow ────────────────────────────────────────────────────────────────

function BalanceRow({
  name,
  symbol,
  address,
  value,
  isLoading,
  isError,
  onRefresh,
}: {
  name: string;
  symbol: string;
  address?: string;
  value: string;
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-row justify-between items-center gap-2">
      <div className="flex flex-col gap-1">
        <div className="flex flex-row gap-2 items-center">
          <h3>{name}</h3>
          <h3 className="text-muted-foreground">{symbol}</h3>
          {address && (
            <button
              type="button"
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground hover:cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">-- %</p>
      </div>
      <div className="flex flex-col gap-1 text-right">
        <p className="text-sm text-muted-foreground">$ --</p>
        <div className="flex flex-row gap-2 items-center justify-end">
          {isLoading ? (
            <Skeleton className="w-10 h-4" />
          ) : isError ? (
            <span className="text-xs text-destructive">error</span>
          ) : (
            <div>{value}</div>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className="text-muted-foreground hover:text-foreground hover:cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
