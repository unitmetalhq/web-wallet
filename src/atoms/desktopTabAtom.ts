import { atom } from "jotai";

export type DesktopTab = "home" | "backup" | "settings" | "address-book";

export const desktopTabAtom = atom<DesktopTab>("home");
