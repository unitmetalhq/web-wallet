export interface WagmiPreparedTransaction {
  to: string;
  value?: string;
  account?: string;
  from?: string;
  type?: string;
  chainId: number;
  gas?: string;
  nonce?: number;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  data?: string;
}
