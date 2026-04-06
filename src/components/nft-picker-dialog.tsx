import { useState } from "react";
import { useAtomValue } from "jotai";
import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import { customNftsAtom } from "@/atoms/customNftsAtom";
import type { NftCollection } from "@/atoms/customNftsAtom";
import { useQuery } from "@tanstack/react-query";
import { useReadContracts } from "wagmi";
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

const CHAIN_ID = 1;

// Same ABI as balances.tsx — identical contracts array → same wagmi cache key
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

type NftCollectionEntry = NftCollection & { isVerified: boolean };
type OwnedNft = { collection: NftCollectionEntry; tokenId: bigint };

export function NftPickerDialog({
  contractValue,
  tokenIdValue,
  onSelect,
}: {
  contractValue: string;
  tokenIdValue: string;
  onSelect: (contractAddress: string, tokenId: string) => void;
}) {
  const [search, setSearch] = useState("");

  const activeWallet = useAtomValue(activeWalletAtom);
  const customNfts = useAtomValue(customNftsAtom);
  const address = activeWallet?.address as Address | undefined;

  // ── NFT list — same ["nft-list"] key as balances.tsx → cache hit ─────────────
  const { data: nftListData, isLoading: isLoadingNftList } = useQuery({
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

  // Same order as balances.tsx → same wagmi multicall key → cache hit
  const allNftCollections: NftCollectionEntry[] = [
    ...listNfts.map((c) => ({ ...c, isVerified: true })),
    ...dedupedCustomNfts.map((c) => ({ ...c, isVerified: false })),
  ];

  // ── Step 1: balanceOf — same contracts as balances.tsx → cache hit ────────────
  const { data: nftCollectionBalances } = useReadContracts({
    contracts: allNftCollections.map((c) => ({
      address: c.address,
      abi: erc721EnumerableAbi,
      functionName: "balanceOf" as const,
      args: [address!] as [Address],
      chainId: CHAIN_ID,
    })),
    query: { enabled: !!address && allNftCollections.length > 0, refetchOnMount: false },
  });

  // ── Step 2: tokenOfOwnerByIndex — same contracts as balances.tsx → cache hit ──
  const tokenIndexRequests = allNftCollections.flatMap((collection, ci) => {
    const raw = nftCollectionBalances?.[ci];
    if (raw?.status !== "success") return [];
    const count = Number(raw.result as bigint);
    return Array.from({ length: count }, (_, i) => ({ collection, index: i }));
  });

  const { data: tokenIdResults } = useReadContracts({
    contracts: tokenIndexRequests.map(({ collection, index }) => ({
      address: collection.address,
      abi: erc721EnumerableAbi,
      functionName: "tokenOfOwnerByIndex" as const,
      args: [address!, BigInt(index)] as [Address, bigint],
      chainId: CHAIN_ID,
    })),
    query: { enabled: !!address && tokenIndexRequests.length > 0, refetchOnMount: false },
  });

  // ── Owned NFTs ────────────────────────────────────────────────────────────────
  const ownedNfts: OwnedNft[] = tokenIndexRequests
    .map((req, i) => {
      const raw = tokenIdResults?.[i];
      if (raw?.status !== "success") return null;
      return { collection: req.collection, tokenId: raw.result as bigint };
    })
    .filter((t): t is OwnedNft => t !== null);

  // Collections with no owned tokens — still show so user can fill contract address
  const ownedAddresses = new Set(ownedNfts.map((n) => n.collection.address.toLowerCase()));
  const unownedCollections = allNftCollections.filter(
    (c) => !ownedAddresses.has(c.address.toLowerCase())
  );

  const selectedNft = ownedNfts.find(
    (nft) =>
      nft.collection.address.toLowerCase() === contractValue.toLowerCase() &&
      nft.tokenId.toString() === tokenIdValue
  );
  const selectedCollection =
    !selectedNft &&
    allNftCollections.find((c) => c.address.toLowerCase() === contractValue.toLowerCase());

  const matchesSearch = (c: NftCollectionEntry) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.symbol.toLowerCase().includes(search.toLowerCase());

  const filteredOwned = ownedNfts.filter(
    (nft) =>
      matchesSearch(nft.collection) || nft.tokenId.toString().includes(search)
  );
  const filteredUnowned = unownedCollections.filter((c) => matchesSearch(c));

  return (
    <Dialog onOpenChange={(open) => { if (!open) setSearch(""); }}>
      <DialogTrigger
        disabled={isLoadingNftList}
        render={
          <button
            type="button"
            className="flex items-center gap-1 shrink-0 border border-primary px-2.5 py-1.5 text-xs hover:cursor-pointer hover:bg-accent transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed h-full"
          />
        }
      >
        {isLoadingNftList ? (
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        ) : (
          <>
            <span>
              {selectedNft
                ? `${selectedNft.collection.symbol} #${selectedNft.tokenId}`
                : selectedCollection
                  ? selectedCollection.symbol
                  : "Select"}
            </span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select NFT</DialogTitle>
        </DialogHeader>
        <input
          autoFocus
          type="text"
          placeholder="Search by name, symbol or token ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-input bg-transparent px-2.5 py-2 text-xs outline-none placeholder:text-muted-foreground"
        />
        <div className="flex flex-col max-h-64 overflow-y-auto">
          {filteredOwned.length === 0 && filteredUnowned.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">No results</p>
          ) : (
            <>
              {/* Owned — fills contract + tokenId */}
              {filteredOwned.map((nft) => (
                <DialogClose
                  key={`${nft.collection.address}-${nft.tokenId}`}
                  render={
                    <button
                      type="button"
                      onClick={() => onSelect(nft.collection.address, nft.tokenId.toString())}
                      className="flex items-center justify-between px-2.5 py-2 text-xs text-left hover:bg-accent transition-colors hover:cursor-pointer"
                    />
                  }
                >
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{nft.collection.symbol}</span>
                    {nft.collection.isVerified && <BadgeCheck className="w-3 h-3" />}
                    <span className="text-muted-foreground">{nft.collection.name}</span>
                  </div>
                  <span className="font-mono text-muted-foreground">#{nft.tokenId.toString()}</span>
                </DialogClose>
              ))}

              {/* Unowned — fills contract address only, tokenId left for manual entry */}
              {filteredUnowned.map((collection) => (
                <DialogClose
                  key={collection.address}
                  render={
                    <button
                      type="button"
                      onClick={() => onSelect(collection.address, "")}
                      className="flex items-center justify-between px-2.5 py-2 text-xs text-left hover:bg-accent transition-colors hover:cursor-pointer"
                    />
                  }
                >
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{collection.symbol}</span>
                    {collection.isVerified && <BadgeCheck className="w-3 h-3" />}
                    <span className="text-muted-foreground">{collection.name}</span>
                  </div>
                </DialogClose>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
