/**
 * Parses an address out of QR code data, handling:
 *   - Plain address:        0xABC...
 *   - ERC-3770 short name:  eth:0xABC...
 *   - CAIP-10 / EIP-155:   eip155:1:0xABC...
 *   - EIP-681 URI:          ethereum:0xABC...@1/transfer?...
 */
export function parseQrAddress(raw: string): string | null {
  let candidate = raw.trim();
  if (candidate.includes(":")) {
    const parts = candidate.split(":");
    candidate = parts[parts.length - 1];
  }
  candidate = candidate.split("@")[0].split("/")[0].split("?")[0];
  if (/^0x[0-9a-fA-F]{40}$/.test(candidate)) {
    return candidate;
  }
  return null;
}