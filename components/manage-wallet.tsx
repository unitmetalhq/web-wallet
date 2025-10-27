"use client";

import { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import CreateWallet from "@/components/create-wallet";
import type { UmKeystore } from '@/types/wallet';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { truncateAddress } from "@/lib/utils";

export const walletsAtom = atomWithStorage<Array<UmKeystore>>("wallets", []);

export default function ManageWallet() {
  const [wallets, setWallets] = useAtom<Array<UmKeystore>>(walletsAtom);

  return (
    <div className="flex flex-col border-2 border-primary gap-2 pb-8">
      <div className="flex flex-row justify-between items-center bg-primary text-secondary p-1">
        <h1 className="text-lg md:text-xl font-bold">Manage</h1>
      </div>
      {wallets && wallets.length > 0 ? (
        <div className="flex flex-col gap-4 px-4 py-2">
          <div className="flex flex-col gap-2">
            <h2 className="text-md font-bold">Wallets</h2>
            <Select>
              <SelectTrigger className="w-full border-primary border rounded-none">
                <SelectValue placeholder="Select a wallet" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {wallets.map((wallet) => (
                    <SelectItem key={wallet.address} value={wallet.address}>
                      <div className="flex flex-row gap-2">
                        <p>{wallet.name}</p>
                        <p className="text-muted-foreground">{truncateAddress(wallet.address)}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-md font-bold">New</h2>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-4 py-2">
          <p className="text-sm">
            No wallets found. Create a new wallet to get started.
          </p>
          <p>
            Enter a password below to encrypt your wallet. The encrypted wallet
            is stored locally in your browser storage and is not connected to
            any server.
          </p>
          <CreateWallet />
        </div>
      )}
    </div>
  );
}
