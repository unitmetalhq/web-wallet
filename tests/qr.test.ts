import { describe, test, expect } from "vitest";
import { parseQrAddress } from "@/lib/qr";

const VALID_LOWER = "0x1234567890abcdef1234567890abcdef12345678";
// EIP-55 checksum form of the same address
const VALID_CHECKSUM = "0x1234567890AbCdEf1234567890AbCdEf12345678";

describe("parseQrAddress", () => {

  // ── Plain address ────────────────────────────────────────────────────────────

  test("plain 0x lowercase address", () => {
    expect(parseQrAddress(VALID_LOWER)).toBe(VALID_LOWER);
  });

  test("EIP-55 checksum address (mixed case)", () => {
    expect(parseQrAddress(VALID_CHECKSUM)).toBe(VALID_CHECKSUM);
  });

  test("all-uppercase hex address", () => {
    const upper = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
    expect(parseQrAddress(upper)).toBe(upper);
  });

  test("trims leading/trailing whitespace", () => {
    expect(parseQrAddress(`  ${VALID_LOWER}  `)).toBe(VALID_LOWER);
  });

  // ── ERC-3770 (short-name prefix) ─────────────────────────────────────────────

  test("eth:0x... prefix", () => {
    expect(parseQrAddress(`eth:${VALID_LOWER}`)).toBe(VALID_LOWER);
  });

  test("arb1:0x... prefix (Arbitrum)", () => {
    expect(parseQrAddress(`arb1:${VALID_LOWER}`)).toBe(VALID_LOWER);
  });

  test("base:0x... prefix", () => {
    expect(parseQrAddress(`base:${VALID_LOWER}`)).toBe(VALID_LOWER);
  });

  test("matic:0x... prefix (Polygon)", () => {
    expect(parseQrAddress(`matic:${VALID_LOWER}`)).toBe(VALID_LOWER);
  });

  // ── CAIP-10 / EIP-155 ────────────────────────────────────────────────────────

  test("eip155:1:0x... (Ethereum mainnet)", () => {
    expect(parseQrAddress(`eip155:1:${VALID_LOWER}`)).toBe(VALID_LOWER);
  });

  test("eip155:137:0x... (Polygon)", () => {
    expect(parseQrAddress(`eip155:137:${VALID_LOWER}`)).toBe(VALID_LOWER);
  });

  test("eip155:8453:0x... (Base)", () => {
    expect(parseQrAddress(`eip155:8453:${VALID_LOWER}`)).toBe(VALID_LOWER);
  });

  // ── EIP-681 URI ──────────────────────────────────────────────────────────────

  test("ethereum:0x...@1 (chain suffix)", () => {
    expect(parseQrAddress(`ethereum:${VALID_LOWER}@1`)).toBe(VALID_LOWER);
  });

  test("ethereum:0x.../transfer?value=1000000 (path + query)", () => {
    expect(parseQrAddress(`ethereum:${VALID_LOWER}/transfer?value=1000000`)).toBe(VALID_LOWER);
  });

  test("ethereum:0x...@1/transfer?uint256=1000 (full form)", () => {
    expect(parseQrAddress(`ethereum:${VALID_LOWER}@1/transfer?uint256=1000`)).toBe(VALID_LOWER);
  });

  test("ethereum:0x... (no suffix at all)", () => {
    expect(parseQrAddress(`ethereum:${VALID_LOWER}`)).toBe(VALID_LOWER);
  });

  // ── Address length boundaries ────────────────────────────────────────────────

  test("returns null for address that is 1 char too short (41 chars)", () => {
    const short = "0x" + "a".repeat(39); // 41 total
    expect(parseQrAddress(short)).toBeNull();
  });

  test("returns null for address that is 1 char too long (43 chars)", () => {
    const long = "0x" + "a".repeat(41); // 43 total
    expect(parseQrAddress(long)).toBeNull();
  });

  test("exact 42-char 0x address is accepted", () => {
    const exact = "0x" + "a".repeat(40);
    expect(parseQrAddress(exact)).toBe(exact);
  });

  // ── Invalid inputs ───────────────────────────────────────────────────────────

  test("returns null for empty string", () => {
    expect(parseQrAddress("")).toBeNull();
  });

  test("returns null for a plain string", () => {
    expect(parseQrAddress("not-an-address")).toBeNull();
  });

  test("returns null for address that is too short", () => {
    expect(parseQrAddress("0x1234567890abcdef")).toBeNull();
  });

  test("returns null for address that is too long", () => {
    expect(parseQrAddress(`${VALID_LOWER}FF`)).toBeNull();
  });

  test("returns null for non-hex characters in address", () => {
    expect(
      parseQrAddress("0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG")
    ).toBeNull();
  });

  test("returns null for an ENS name", () => {
    expect(parseQrAddress("vitalik.eth")).toBeNull();
  });

  test("returns null for whitespace-only string", () => {
    expect(parseQrAddress("   ")).toBeNull();
  });

  test("returns null for 0x alone (no hex digits)", () => {
    expect(parseQrAddress("0x")).toBeNull();
  });

  test("returns null for address missing 0x prefix", () => {
    // 40 hex chars but no '0x'
    expect(parseQrAddress("1234567890abcdef1234567890abcdef12345678")).toBeNull();
  });

  test("returns null for bitcoin address (non-EVM)", () => {
    expect(parseQrAddress("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq")).toBeNull();
  });

  // ── Whitespace edge cases ────────────────────────────────────────────────────

  test("trims before parsing ERC-3770 prefix", () => {
    expect(parseQrAddress(`  eth:${VALID_LOWER}  `)).toBe(VALID_LOWER);
  });

  test("trims before parsing CAIP-10", () => {
    expect(parseQrAddress(`  eip155:1:${VALID_LOWER}  `)).toBe(VALID_LOWER);
  });
});
