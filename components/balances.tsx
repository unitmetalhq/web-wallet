"use client";

import { useState } from "react";
import { useAtomValue } from "jotai";
import type { UmKeystore } from "@/types/wallet";
import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import { useBalance } from "wagmi";
import { Address } from "viem";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConfig } from "wagmi";
import { Skeleton } from "@/components/ui/skeleton";
import { formatUnits } from "viem";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

export default function Balances() {
  const config = useConfig();
  const [activeChain, setActiveChain] = useState<number | null>(null);
  const activeWallet = useAtomValue<UmKeystore | null>(activeWalletAtom);

  const {
    data: balance,
    isLoading: isLoadingBalance,
    isError: isErrorBalance,
    refetch: refetchBalance,
  } = useBalance({
    address: activeWallet?.address as Address,
    chainId: activeChain as number,
  });

  function handleSelectChain(chainId: number) {
    setActiveChain(chainId);
  }

  return (
    <div className="flex flex-col border-2 border-primary gap-2 pb-8">
      <div className="flex flex-row justify-between items-center bg-primary text-secondary p-1">
        <h1 className="text-lg md:text-xl font-bold">Balances</h1>
      </div>
      <div className="flex flex-col gap-4 px-4 py-2">
        <div className="flex flex-row gap-2">
          <Select onValueChange={(value) => handleSelectChain(Number(value))}>
            <SelectTrigger className="w-full border-primary border rounded-none">
              <SelectValue placeholder="Select a chain" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {config.chains.map((chain) => (
                  <SelectItem key={chain.id} value={chain.id.toString()}>
                    <div className="flex flex-row gap-2">
                      <div>{chain.name}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            className="hover:cursor-pointer rounded-none"
            size="icon"
            onClick={() => refetchBalance()}
          >
            <RefreshCcw />
          </Button>
        </div>
      </div>
      {isErrorBalance && (
        <div className="flex flex-col gap-4 px-4 py-2">
          <div className="bg-destructive text-destructive-foreground p-2 rounded-none">
            Error loading balance
          </div>
        </div>
      )}
      <div className="flex flex-col gap-4 px-4 py-2">
        <div className="flex flex-row justify-between items-center gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex flex-row gap-2">
              <h3>
                {
                  activeChain ? config.chains.find((chain) => chain.id === activeChain)
                    ?.nativeCurrency.name : "Name"
                }
              </h3>
              <h3 className="text-muted-foreground">
                {
                  activeChain ? config.chains.find((chain) => chain.id === activeChain)
                    ?.nativeCurrency.symbol : "Symbol"
                }
              </h3>
            </div>
            <div className="flex flex-row gap-2 items-center">
              <div className="text-muted-foreground">&gt;</div>
              {isLoadingBalance ? (
                <Skeleton className="w-10 h-4" />
              ) : (
                <div>{formatUnits(balance?.value ?? BigInt(0), 18)}</div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <p>$ --</p>
            <p>-- %</p>
          </div>
        </div>
      </div>
    </div>
  );
}
