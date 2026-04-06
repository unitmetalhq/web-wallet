import { useState } from "react";
import { useAtomValue } from "jotai";
import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import { customTokensAtom } from "@/atoms/customTokensAtom";
import type { TokenListToken } from "@/atoms/customTokensAtom";
import { useQuery } from "@tanstack/react-query";
import { useReadContracts } from "wagmi";
import { erc20Abi } from "viem";
import type { Address } from "viem";
import { Loader2, ChevronDown, BadgeCheck } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ETH_SENTINEL = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const CHAIN_ID = 1;

export function TokenPickerDialog({
  value,
  onSelect,
  disabledAddress,
}: {
  value: string;
  onSelect: (address: string) => void;
  disabledAddress?: string;
}) {
  const [search, setSearch] = useState("");

  const activeWallet = useAtomValue(activeWalletAtom);
  const customTokens = useAtomValue(customTokensAtom);
  const address = activeWallet?.address as Address | undefined;

  // ── Token list — same ["token-list"] key as balances.tsx → shared cache ──────
  const { data: tokenList, isLoading: isLoadingTokenList } = useQuery({
    queryKey: ["token-list"],
    queryFn: async () => {
      const res = await fetch("/token-list.json");
      if (!res.ok) throw new Error("Failed to fetch token list");
      return res.json() as Promise<{ tokens: TokenListToken[] }>;
    },
    staleTime: Infinity,
  });

  const listTokens: TokenListToken[] = tokenList?.tokens.filter(
    (t) => t.chainId === CHAIN_ID && t.address.toLowerCase() !== ETH_SENTINEL
  ) ?? [];

  const customForChain = customTokens.filter((t) => t.chainId === CHAIN_ID);
  const dedupedCustom = customForChain.filter(
    (ct) => !listTokens.some((lt) => lt.address.toLowerCase() === ct.address.toLowerCase())
  );

  // Same order as balances.tsx → same wagmi multicall key → cache hit
  const allTokens = [
    ...listTokens.map((t) => ({ ...t, isVerified: true })),
    ...dedupedCustom.map((t) => ({ ...t, isVerified: false })),
  ];

  // ── Balances — same contracts as balances.tsx → cache hit ────────────────────
  const { data: tokenBalances } = useReadContracts({
    contracts: allTokens.map((token) => ({
      address: token.address,
      abi: erc20Abi,
      functionName: "balanceOf" as const,
      args: [address!] as [Address],
      chainId: CHAIN_ID,
    })),
    query: { enabled: !!address && allTokens.length > 0, refetchOnMount: false },
  });

  const balanceMap = new Map<string, bigint>();
  allTokens.forEach((token, i) => {
    const raw = tokenBalances?.[i];
    if (raw?.status === "success") {
      balanceMap.set(token.address.toLowerCase(), raw.result as bigint);
    }
  });

  // ── Sort: balance desc first, then alphabetical ───────────────────────────────
  const sortedTokens = [...allTokens].sort((a, b) => {
    const balA = balanceMap.get(a.address.toLowerCase()) ?? 0n;
    const balB = balanceMap.get(b.address.toLowerCase()) ?? 0n;
    if (balA > 0n && balB === 0n) return -1;
    if (balA === 0n && balB > 0n) return 1;
    if (balA !== balB) return balA > balB ? -1 : 1;
    return 0;
  });

  const selected = allTokens.find((t) => t.address.toLowerCase() === value.toLowerCase());
  const filtered = sortedTokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog onOpenChange={(open) => { if (!open) setSearch(""); }}>
      <DialogTrigger
        disabled={isLoadingTokenList}
        render={
          <button
            type="button"
            className="flex items-center gap-1 shrink-0 border border-primary px-2.5 py-1.5 text-xs hover:cursor-pointer hover:bg-accent transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed h-full"
          />
        }
      >
        {isLoadingTokenList ? (
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        ) : (
          <>
            <span>{selected ? selected.symbol : "Select"}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select token</DialogTitle>
        </DialogHeader>
        <input
          autoFocus
          type="text"
          placeholder="Search by name or symbol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-input bg-transparent px-2.5 py-2 text-xs outline-none placeholder:text-muted-foreground"
        />
        <div className="flex flex-col max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">No tokens found</p>
          ) : (
            filtered.map((token) => {
              return (
                <DialogClose
                  key={token.address}
                  disabled={token.address === disabledAddress}
                  render={
                    <button
                      type="button"
                      onClick={() => onSelect(token.address)}
                      className="flex items-center justify-between px-2.5 py-2 text-xs text-left hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:cursor-pointer"
                    />
                  }
                >
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{token.symbol}</span>
                    {token.isVerified && <BadgeCheck className="w-3 h-3" />}
                  </div>
                  <span className="text-muted-foreground">{token.name}</span>
                </DialogClose>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
