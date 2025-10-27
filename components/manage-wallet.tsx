"use client";

import { useAtomValue } from "jotai";
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
import { Button } from "@/components/ui/button";
import { walletsAtom } from "@/atoms/walletsAtom";

export default function ManageWallet() {
  const wallets = useAtomValue<Array<UmKeystore>>(walletsAtom);

  return (
    <div className="flex flex-col border-2 border-primary gap-2 pb-8">
      <div className="flex flex-row justify-between items-center bg-primary text-secondary p-1">
        <h1 className="text-lg md:text-xl font-bold">Wallets</h1>
      </div>
      {wallets && wallets.length > 0 ? (
        <div className="flex flex-col gap-4 px-4 py-2">
          <div className="flex flex-col gap-2">
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
          <div className="flex flex-row gap-2">
            <Button className="w-fit rounded-none hover:cursor-pointer">
              Copy address
            </Button>
            <Button className="w-fit rounded-none hover:cursor-pointer">
              QR
            </Button>
          </div>
          <div className="flex flex-col gap-2 mt-6 border-t-2 border-primary pt-4">
            <h2 className="text-md font-bold">You can create a new wallet here</h2>
            <CreateWallet />
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
