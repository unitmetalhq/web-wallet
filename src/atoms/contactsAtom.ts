import { atomWithStorage } from "jotai/utils";
import type { Contact } from "@/types/contact";

export const contactsAtom = atomWithStorage<Array<Contact>>("address-book", []);
