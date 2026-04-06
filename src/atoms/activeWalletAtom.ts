import { atomWithStorage } from "jotai/utils";
import type { UmKeystore } from "@/types/wallet";

export const activeWalletAtom = atomWithStorage<UmKeystore | null>("activeWallet", null);