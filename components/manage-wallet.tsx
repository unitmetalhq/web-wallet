"use client";

import { useState, useEffect } from "react";
import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

const walletsAtom = atomWithStorage('wallets', [])

export default function ManageWallet() {

  const [wallets, setWallets] = useAtom(walletsAtom)

  return (
    <div className="flex flex-col border-2 border-primary gap-2 pb-8">
      <div className="flex flex-row justify-between items-center bg-primary text-secondary p-1">
        <h1 className="text-lg md:text-xl font-bold">Manage</h1>
      </div>
      {
        wallets ? (
          <div className="flex flex-col gap-4 px-4 py-2">
            <div className="flex flex-row justify-between items-center">
              <h2 className="text-md font-bold">Wallet Address</h2>
              <p className="text-sm">0x1234567890123456789012345678901234567890</p>
            </div>
          </div>
        )
        : (
          <div className="flex flex-col gap-4 px-4 py-2">
            <p className="text-sm">No wallets found</p>
          </div>
        )
      }
    </div>
  );
}
