import { atomWithStorage } from "jotai/utils";
import type { UmSetting } from "@/types/setting";

export const settingsAtom = atomWithStorage<UmSetting>("settings", {
  rpcInfo: [],
});