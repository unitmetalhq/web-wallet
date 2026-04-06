import { atomWithStorage } from "jotai/utils";

export type NftCollection = {
  chainId: number;
  address: `0x${string}`;
  name: string;
  symbol: string;
  standard: "ERC721";
};

export const customNftsAtom = atomWithStorage<NftCollection[]>("customNfts", []);
