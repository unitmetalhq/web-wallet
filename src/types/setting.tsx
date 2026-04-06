/**
 * A single custom RPC endpoint.
 * Stored as a plain object — no separator encoding needed since we use JSON.
 */
export interface RpcEntry {
  id: string;
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
  /** List of user-defined RPC endpoints. */
  rpcList: RpcEntry[];
  /** The currently active RPC entry, or null to use the env-var default. */
  activeRpc: RpcEntry | null;
  /**
   * When true, all network fetching (balances, gas, ENS, etc.) is suppressed.
   * The wallet can still sign transactions offline and broadcast them manually.
   */
  offlineMode: boolean;
}
