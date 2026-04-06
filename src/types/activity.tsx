export type TxType = "native" | "erc20" | "erc721" | "raw";

export interface ActivityRecord {
  id?: number;
  txHash: string;
  from: string;
  to: string;
  chainId: number;
  type: TxType;
  nativeValue?: string;    // amount in wei (e.g. "1000000000000000000")
  tokenValue?: string;     // amount in wei for ERC20
  nftId?: string;          // token ID for ERC721
  tokenAddress?: string;   // contract address for ERC20/ERC721
  tokenSymbol?: string;    // symbol for ERC20 (e.g. "USDC")
  tokenDecimals?: number;  // decimals for ERC20
  gasPrice?: string;       // gas price in wei at time of send
  ensName?: string;        // ENS name if recipient was entered as .eth
  timestamp: number;       // Date.now() at confirmation
}
