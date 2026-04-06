import { useState } from "react";
import { useReadContracts } from "wagmi";
import { erc20Abi } from "viem";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TokenListToken } from "@/atoms/customTokensAtom";

const CHAIN_ID = 1;

export default function AddCustomToken({
  onAdd,
  onCancel,
}: {
  onAdd: (token: TokenListToken) => void;
  onCancel: () => void;
}) {
  const [input, setInput] = useState("");
  const [queryAddress, setQueryAddress] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isValid = (addr: string) => /^0x[0-9a-fA-F]{40}$/.test(addr.trim());

  const { data, isLoading, isFetching } = useReadContracts({
    contracts: queryAddress
      ? [
          { address: queryAddress, abi: erc20Abi, functionName: "name",     chainId: CHAIN_ID },
          { address: queryAddress, abi: erc20Abi, functionName: "symbol",   chainId: CHAIN_ID },
          { address: queryAddress, abi: erc20Abi, functionName: "decimals", chainId: CHAIN_ID },
        ]
      : [],
    query: { enabled: !!queryAddress },
  });

  const fetchedName     = data?.[0]?.status === "success" ? (data[0].result as string) : null;
  const fetchedSymbol   = data?.[1]?.status === "success" ? (data[1].result as string) : null;
  const fetchedDecimals = data?.[2]?.status === "success" ? (data[2].result as number) : null;
  const isFetched = fetchedName !== null && fetchedSymbol !== null && fetchedDecimals !== null;
  const fetchFailed = !!queryAddress && !isFetching && !isLoading && !isFetched;
  const busy = isLoading || isFetching;

  function handleLookup() {
    setError(null);
    if (!isValid(input)) {
      setError("Must be a valid 0x address (42 chars)");
      return;
    }
    setQueryAddress(input.trim() as `0x${string}`);
  }

  function handleAdd() {
    if (!queryAddress || !isFetched) return;
    onAdd({
      chainId: CHAIN_ID,
      address: queryAddress,
      name: fetchedName!,
      symbol: fetchedSymbol!,
      decimals: fetchedDecimals!,
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row items-center justify-between">
        <p className="text-xs font-semibold">Add custom token</p>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground hover:cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* address input + lookup */}
      <div className="flex flex-row gap-2">
        <Input
          className="rounded-none h-7 text-xs flex-1"
          placeholder="Token address (0x...)"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setQueryAddress(null);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleLookup()}
        />
        <Button
          type="button"
          variant="outline"
          className="rounded-none h-7 text-xs px-2 hover:cursor-pointer shrink-0"
          onClick={handleLookup}
          disabled={busy}
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : "Look up"}
        </Button>
      </div>

      {/* fetched metadata preview */}
      {isFetched && (
        <div className="flex flex-row items-center justify-between border border-border px-2 py-1.5 text-xs">
          <div className="flex flex-row gap-2 items-center">
            <span className="font-medium">{fetchedName}</span>
            <span className="text-muted-foreground">{fetchedSymbol}</span>
            <span className="text-muted-foreground">{fetchedDecimals} decimals</span>
          </div>
          <Button
            type="button"
            className="rounded-none h-6 text-xs px-2 hover:cursor-pointer"
            onClick={handleAdd}
          >
            Add
          </Button>
        </div>
      )}

      {fetchFailed && (
        <p className="text-xs text-red-400">
          Could not fetch token metadata. Check the address and try again.
        </p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
