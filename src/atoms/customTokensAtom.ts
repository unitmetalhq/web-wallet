import { atomWithStorage } from "jotai/utils";

export type TokenListToken = {
  chainId: number;
  address: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
};

export const customTokensAtom = atomWithStorage<TokenListToken[]>("customTokens", []);
