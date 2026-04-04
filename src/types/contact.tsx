export interface ContactMetadata {
  tags: string[];
  version: string;
  note: string;
}

export interface Contact {
  id: string;
  address: string;
  name: string;
  /** EVM chain ID, or null to indicate chain-agnostic */
  chain: number | null;
  metadata: ContactMetadata;
}
