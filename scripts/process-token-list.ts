/**
 * process-token-list.ts
 *
 * Filters a Uniswap-compatible token list down to a single chain
 * and strips the `extensions` field from every token entry.
 *
 * Usage:
 *   bun scripts/process-token-list.ts
 *   bun scripts/process-token-list.ts --chain 1
 *   bun scripts/process-token-list.ts --input dist/token-list.json --output public/token-list.json
 *   bun scripts/process-token-list.ts --dry-run
 */

import { resolve } from "path";

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(flag: string, fallback: string): string {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const ROOT = resolve(import.meta.dir, "..");
const inputPath  = resolve(ROOT, getArg("--input",  "public/token-list.json"));
const outputPath = resolve(ROOT, getArg("--output", "public/token-list.json"));
const chainId    = parseInt(getArg("--chain", "1"), 10);
const dryRun     = args.includes("--dry-run");

// ── Types ─────────────────────────────────────────────────────────────────────

type TokenEntry = {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  extensions?: unknown;
  [key: string]: unknown;
};

type TokenList = {
  name: string;
  timestamp: string;
  version: { major: number; minor: number; patch: number };
  tokens: TokenEntry[];
  [key: string]: unknown;
};

// ── Main ──────────────────────────────────────────────────────────────────────

const raw = await Bun.file(inputPath).json() as TokenList;

const before = raw.tokens.length;
const uniqueChains = [...new Set(raw.tokens.map((t) => t.chainId))].sort((a, b) => a - b);

const filtered: TokenEntry[] = raw.tokens
  .filter((t) => t.chainId === chainId)
  .map(({ extensions: _ext, ...rest }) => rest);

const output: TokenList = {
  ...raw,
  timestamp: new Date().toISOString(),
  tokens: filtered,
};

// ── Report ────────────────────────────────────────────────────────────────────

console.log(`Input:        ${inputPath}`);
console.log(`Output:       ${outputPath}`);
console.log(`Chains found: ${uniqueChains.join(", ")}`);
console.log(`Tokens before: ${before}`);
console.log(`Tokens after:  ${filtered.length} (chainId ${chainId} only)`);
console.log(`Removed:       ${before - filtered.length} tokens`);

if (dryRun) {
  console.log("\n--dry-run: no file written.");
  process.exit(0);
}

await Bun.write(outputPath, JSON.stringify(output, null, 2));
console.log(`\nWrote ${outputPath}`);
