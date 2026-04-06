import { atom } from "jotai";

export type DesktopTab = "home" | "address-book" | "activity" | "backup" | "settings";

export const desktopTabAtom = atom<DesktopTab>("home");
