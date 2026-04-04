import { atomWithStorage } from "jotai/utils";
import { atom } from "jotai";
import type { WalletSettings } from "@/types/setting";

export const SETTINGS_KEY = "wallet-settings";

export const settingsAtom = atomWithStorage<WalletSettings>(SETTINGS_KEY, {
  rpc: null,
  offlineMode: false,
});

/** Derived atom — convenient shortcut for components that only care about offline mode. */
export const offlineModeAtom = atom((get) => get(settingsAtom).offlineMode);
