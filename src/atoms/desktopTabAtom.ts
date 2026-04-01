import { atom } from "jotai";

export type DesktopTab = "home" | "backup" | "settings";

export const desktopTabAtom = atom<DesktopTab>("home");
