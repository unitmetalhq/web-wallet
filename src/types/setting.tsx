/**
 * A single custom RPC endpoint.
 * Stored as a plain object — no separator encoding needed since we use JSON.
 */
export interface RpcEntry {
  /** Optional human-readable label, e.g. "Alchemy Mainnet" */
  name?: string;
  /** Full HTTP(S) RPC URL */
  url: string;
  /** EVM chain ID this RPC serves */
  chainId: number;
}

/**
 * Root settings object stored under the "wallet-settings" localStorage key.
 */
export interface WalletSettings {
  /**
   * Custom RPC override. null means "use the environment-variable default".
   * Only one entry per wallet (mainnet-only for now).
   */
  rpc: RpcEntry | null;
  /**
   * When true, all network fetching (balances, gas, ENS, etc.) is suppressed.
   * The wallet can still sign transactions offline and broadcast them manually.
   */
  offlineMode: boolean;
}
