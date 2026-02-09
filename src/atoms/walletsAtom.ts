import { atomWithStorage } from "jotai/utils";
import type { UmKeystore } from "@/types/wallet";

export const walletsAtom = atomWithStorage<Array<UmKeystore>>("wallets", []);