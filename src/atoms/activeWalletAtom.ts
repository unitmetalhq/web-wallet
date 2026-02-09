import { atom } from "jotai";
import type { UmKeystore } from "@/types/wallet";

export const activeWalletAtom = atom<UmKeystore | null>(null);