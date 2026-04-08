import { useState } from "react";
import { useAtomValue, useAtom } from "jotai";
import type { UmKeystore } from "@/types/wallet";
import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import { offlineModeAtom } from "@/atoms/settingsAtom";
import { customTokensAtom } from "@/atoms/customTokensAtom";
import type { TokenListToken } from "@/atoms/customTokensAtom";
import { customNftsAtom } from "@/atoms/customNftsAtom";
import type { NftCollection } from "@/atoms/customNftsAtom";
import { useBalance, useConfig, useReadContracts } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatUnits, erc20Abi } from "viem";
import type { Address } from "viem";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Copy, Check, Plus, Trash2, BadgeCheck, RotateCw, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import AddCustomToken from "@/components/add-custom-token";
import AddCustomNft from "@/components/add-custom-nft";

const ETH_SENTINEL = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const CHAIN_ID = 1;

const erc721EnumerableAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "tokenOfOwnerByIndex",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

type TokenWithMeta = TokenListToken & { isVerified: boolean };
type NftCollectionEntry = NftCollection & { isVerified: boolean };
type OwnedNft = { collection: NftCollectionEntry; tokenId: bigint };

export default function Balances() {
  const config = useConfig();
  const activeWallet = useAtomValue<UmKeystore | null>(activeWalletAtom);
  const offlineMode = useAtomValue(offlineModeAtom);
  const [customTokens, setCustomTokens] = useAtom(customTokensAtom);
  const [customNfts, setCustomNfts] = useAtom(customNftsAtom);
  const [showAddTokenForm, setShowAddTokenForm] = useState(false);
  const [showAddNftForm, setShowAddNftForm] = useState(false);

  const address = activeWallet?.address as Address | undefined;
  const isQueryEnabled = !!address && !offlineMode;
  const nativeCurrency = config.chains.find((c) => c.id === CHAIN_ID)?.nativeCurrency;

  // ── Token list ──────────────────────────────────────────────────────────────

  const { data: tokenList, refetch: refetchTokenList } = useQuery({
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
  const dedupedCustomTokens = customForChain.filter(
    (ct) => !listTokens.some((lt) => lt.address.toLowerCase() === ct.address.toLowerCase())
  );

  const allTokens: TokenWithMeta[] = [
    ...listTokens.map((t) => ({ ...t, isVerified: true })),
    ...dedupedCustomTokens.map((t) => ({ ...t, isVerified: false })),
  ];

  // ── Token balances ──────────────────────────────────────────────────────────

  const { data: tokenBalances, isLoading: isLoadingTokens, refetch: refetchTokens } = useReadContracts({
    contracts: allTokens.map((token) => ({
      address: token.address,
      abi: erc20Abi,
      functionName: "balanceOf" as const,
      args: [address!] as [Address],
      chainId: CHAIN_ID,
    })),
    query: { enabled: isQueryEnabled && allTokens.length > 0, refetchOnMount: false },
  });

  const { refetch: refetchNative } = useBalance({
    address,
    chainId: CHAIN_ID,
    query: { enabled: isQueryEnabled, refetchOnMount: false },
  });

  // ── NFT list ────────────────────────────────────────────────────────────────

  const { data: nftListData, refetch: refetchNftList } = useQuery({
    queryKey: ["nft-list"],
    queryFn: async () => {
      const res = await fetch("/nft-list.json");
      if (!res.ok) throw new Error("Failed to fetch NFT list");
      return res.json() as Promise<{ collections: NftCollection[] }>;
    },
    staleTime: Infinity,
  });

  const listNfts: NftCollection[] = nftListData?.collections.filter(
    (c) => c.chainId === CHAIN_ID
  ) ?? [];

  const customNftsForChain = customNfts.filter((c) => c.chainId === CHAIN_ID);
  const dedupedCustomNfts = customNftsForChain.filter(
    (cn) => !listNfts.some((ln) => ln.address.toLowerCase() === cn.address.toLowerCase())
  );

  const allNftCollections: NftCollectionEntry[] = [
    ...listNfts.map((c) => ({ ...c, isVerified: true })),
    ...dedupedCustomNfts.map((c) => ({ ...c, isVerified: false })),
  ];

  // ── NFT step 1: balanceOf per collection ────────────────────────────────────

  const {
    data: nftCollectionBalances,
    isLoading: isLoadingNftBalances,
    refetch: refetchNftBalances,
  } = useReadContracts({
    contracts: allNftCollections.map((c) => ({
      address: c.address,
      abi: erc721EnumerableAbi,
      functionName: "balanceOf" as const,
      args: [address!] as [Address],
      chainId: CHAIN_ID,
    })),
    query: { enabled: isQueryEnabled && allNftCollections.length > 0, refetchOnMount: false },
  });

  // ── NFT step 2: tokenOfOwnerByIndex for collections with balance > 0 ────────

  const tokenIndexRequests = allNftCollections.flatMap((collection, ci) => {
    const raw = nftCollectionBalances?.[ci];
    if (raw?.status !== "success") return [];
    const count = Number(raw.result as bigint);
    return Array.from({ length: count }, (_, i) => ({ collection, index: i }));
  });

  const {
    data: tokenIdResults,
    isLoading: isLoadingTokenIds,
    refetch: refetchTokenIds,
  } = useReadContracts({
    contracts: tokenIndexRequests.map(({ collection, index }) => ({
      address: collection.address,
      abi: erc721EnumerableAbi,
      functionName: "tokenOfOwnerByIndex" as const,
      args: [address!, BigInt(index)] as [Address, bigint],
      chainId: CHAIN_ID,
    })),
    query: { enabled: isQueryEnabled && tokenIndexRequests.length > 0, refetchOnMount: false },
  });

  // ── Owned NFTs ──────────────────────────────────────────────────────────────

  const ownedNfts: OwnedNft[] = tokenIndexRequests
    .map((req, i) => {
      const raw = tokenIdResults?.[i];
      if (raw?.status !== "success") return null;
      return { collection: req.collection, tokenId: raw.result as bigint };
    })
    .filter((t): t is OwnedNft => t !== null);

  const isLoadingNfts = isLoadingNftBalances || isLoadingTokenIds;

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleRemoveCustomToken(tokenAddress: string) {
    setCustomTokens((prev) => prev.filter((t) => t.address.toLowerCase() !== tokenAddress.toLowerCase()));
  }

  function handleRemoveCustomNft(collectionAddress: string) {
    setCustomNfts((prev) => prev.filter((c) => c.address.toLowerCase() !== collectionAddress.toLowerCase()));
  }

  function handleRefreshTokens() {
    refetchTokenList();
    refetchNative();
    refetchTokens();
  }

  function handleRefreshNfts() {
    refetchNftList();
    refetchNftBalances();
    refetchTokenIds();
  }

  return (
    <div className="flex flex-col border-2 border-primary gap-2 pb-8">
      <div className="flex flex-row justify-between items-center bg-primary text-secondary pl-1">
        <h1 className="text-md font-bold">Balances</h1>
      </div>
      <Tabs defaultValue="token" className="w-full">
        <div className="flex flex-row items-center justify-between p-4">
          <TabsList className="border-primary border rounded-none">
            <TabsTrigger value="token">Token</TabsTrigger>
            <TabsTrigger value="nft">NFT</TabsTrigger>
          </TabsList>
          <Button
            type="button"
            variant="outline"
            onClick={() => { handleRefreshTokens(); handleRefreshNfts(); }}
            className="hover:cursor-pointer"
          >
            <RotateCw />
            Refresh
          </Button>
        </div>

        {/* ── Token tab ───────────────────────────────────────────────────── */}
        <TabsContent value="token" className="flex flex-col gap-2">

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

          {/* ERC-20 balances */}
          {allTokens.length > 0 && (
            <>
              <div className="px-4">
                <div className="border-t border-border" />
              </div>
              <div className="flex flex-col gap-4 px-4 py-2">
                {allTokens.map((token, i) => {
                  const raw = tokenBalances?.[i];
                  const rawBalance = raw?.status === "success" ? (raw.result as bigint) : undefined;
                  const isCustomAdded = customForChain.some(
                    (ct) => ct.address.toLowerCase() === token.address.toLowerCase()
                  );

                  if (token.isVerified && !isCustomAdded) {
                    if (!isQueryEnabled) return null;
                    if (!isLoadingTokens && (rawBalance === undefined || rawBalance === 0n)) return null;
                  }

                  return (
                    <BalanceRow
                      key={token.address}
                      name={token.name}
                      symbol={token.symbol}
                      address={token.address}
                      value={formatUnits(rawBalance ?? BigInt(0), token.decimals)}
                      isLoading={isQueryEnabled && isLoadingTokens}
                      isError={raw?.status === "failure"}
                      isVerified={token.isVerified}
                      onRefresh={refetchTokens}
                      onRemove={token.isVerified ? undefined : () => handleRemoveCustomToken(token.address)}
                    />
                  );
                })}
              </div>
            </>
          )}

          {/* Add custom token */}
          <div className="px-4">
            <div className="border-t border-border mb-3" />
            {showAddTokenForm ? (
              <AddCustomToken
                onAdd={(token) => {
                  setCustomTokens((prev) => [...prev, token]);
                  setShowAddTokenForm(false);
                }}
                onCancel={() => setShowAddTokenForm(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowAddTokenForm(true)}
                className="flex flex-row items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add custom token
              </button>
            )}
          </div>
        </TabsContent>

        {/* ── NFT tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="nft" className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 px-4">
            {isLoadingNfts ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="w-full h-8" />
                <Skeleton className="w-full h-8" />
              </div>
            ) : (
              <>
                {ownedNfts.length === 0 && customNftsForChain.length === 0 && (
                  <p className="text-xs text-muted-foreground">No NFTs found</p>
                )}
                {ownedNfts.map((nft) => (
                  <NftRow
                    key={`${nft.collection.address}-${nft.tokenId}`}
                    nft={nft}
                    onRefresh={handleRefreshNfts}
                    onRemoveCollection={
                      nft.collection.isVerified
                        ? undefined
                        : () => handleRemoveCustomNft(nft.collection.address)
                    }
                  />
                ))}
                {/* Custom collections with no owned tokens — always show */}
                {customNftsForChain
                  .filter((c) => !ownedNfts.some(
                    (n) => n.collection.address.toLowerCase() === c.address.toLowerCase()
                  ))
                  .map((collection) => (
                    <NftCollectionRow
                      key={collection.address}
                      collection={{ ...collection, isVerified: false }}
                      onRefresh={handleRefreshNfts}
                      onRemove={() => handleRemoveCustomNft(collection.address)}
                    />
                  ))}
              </>
            )}
          </div>

          {/* Add custom NFT collection */}
          <div className="px-4">
            <div className="border-t border-border mb-3" />
            {showAddNftForm ? (
              <AddCustomNft
                onAdd={(collection) => {
                  setCustomNfts((prev) => [...prev, collection]);
                  setShowAddNftForm(false);
                }}
                onCancel={() => setShowAddNftForm(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowAddNftForm(true)}
                className="flex flex-row items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add custom NFT collection
              </button>
            )}
          </div>
        </TabsContent>
      </Tabs>
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
      isVerified={true}
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
  isVerified,
  onRefresh,
  onRemove,
}: {
  name: string;
  symbol: string;
  address?: string;
  value: string;
  isLoading: boolean;
  isError: boolean;
  isVerified: boolean;
  onRefresh: () => void;
  onRemove?: () => void;
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
          {isVerified && <BadgeCheck className="w-3.5 h-3.5" />}
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
          {onRemove && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground hover:cursor-pointer"
                  />
                }
              >
                <MoreVertical className="w-3 h-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onClick={onRemove}>
                  <Trash2 className="w-3 h-3" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}

// ── NftCollectionRow — custom collection with no owned tokens ─────────────────

function NftCollectionRow({
  collection,
  onRefresh,
  onRemove,
}: {
  collection: NftCollectionEntry;
  onRefresh: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-row justify-between items-center gap-2">
      <div className="flex flex-row gap-2 items-center">
        <span className="font-medium">{collection.name}</span>
        <span className="text-muted-foreground">{collection.symbol}</span>
      </div>
      <div className="flex flex-row gap-2 items-center">
        <span className="text-xs text-muted-foreground">--</span>
        <button
          type="button"
          onClick={onRefresh}
          className="text-muted-foreground hover:text-foreground hover:cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground hover:cursor-pointer"
              />
            }
          >
            <MoreVertical className="w-3 h-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={onRemove}>
              <Trash2 className="w-3 h-3" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ── NftRow ────────────────────────────────────────────────────────────────────

function NftRow({
  nft,
  onRefresh,
  onRemoveCollection,
}: {
  nft: OwnedNft;
  onRefresh: () => void;
  onRemoveCollection?: () => void;
}) {
  return (
    <div className="flex flex-row justify-between items-center gap-2">
      <div className="flex flex-row gap-2 items-center">
        <span className="font-medium">{nft.collection.name}</span>
        <span className="text-muted-foreground">{nft.collection.symbol}</span>
        {nft.collection.isVerified && <BadgeCheck className="w-3.5 h-3.5" />}
      </div>
      <div className="flex flex-row gap-2 items-center">
        <span className="text-muted-foreground font-mono">#{nft.tokenId.toString()}</span>
        <button
          type="button"
          onClick={onRefresh}
          className="text-muted-foreground hover:text-foreground hover:cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
        {onRemoveCollection && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground hover:cursor-pointer"
                />
              }
            >
              <MoreVertical className="w-3 h-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onClick={onRemoveCollection}>
                <Trash2 className="w-3 h-3" />
                Remove collection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
