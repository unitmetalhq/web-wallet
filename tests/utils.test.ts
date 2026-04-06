import { describe, test, expect } from "vitest";
import { truncateAddress, truncateHash, chainIdToName, cn } from "@/lib/utils";

// ── truncateAddress ──────────────────────────────────────────────────────────

describe("truncateAddress", () => {
  test("truncates a full 42-char address", () => {
    expect(truncateAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(
      "0x1234...5678"
    );
  });

  test("keeps first 6 and last 4 chars", () => {
    const addr = "0xAABBCCDDEEFF00112233445566778899AABBCCDD";
    const result = truncateAddress(addr);
    expect(result.startsWith("0xAABB")).toBe(true);
    expect(result.endsWith("CCDD")).toBe(true);
    expect(result).toContain("...");
  });

  test("returns empty string for undefined", () => {
    expect(truncateAddress(undefined)).toBe("");
  });

  test("returns empty string for empty string", () => {
    expect(truncateAddress("")).toBe("");
  });
});

// ── truncateHash ─────────────────────────────────────────────────────────────

describe("truncateHash", () => {
  test("truncates a full tx hash", () => {
    const hash =
      "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab";
    expect(truncateHash(hash)).toBe("0xabcd...90ab");
  });

  test("returns empty string for undefined", () => {
    expect(truncateHash(undefined)).toBe("");
  });

  test("returns empty string for empty string", () => {
    expect(truncateHash("")).toBe("");
  });

  test("behaves identically to truncateAddress for a 42-char input", () => {
    const addr = "0x1234567890abcdef1234567890abcdef12345678";
    expect(truncateHash(addr)).toBe(truncateAddress(addr));
  });
});

// ── chainIdToName ────────────────────────────────────────────────────────────

describe("chainIdToName", () => {
  test("returns Ethereum for chainId 1", () => {
    expect(chainIdToName(1)).toBe("Ethereum");
  });

  test("returns Polygon for chainId 137", () => {
    expect(chainIdToName(137)).toBe("Polygon");
  });

  test("returns Base for chainId 8453", () => {
    expect(chainIdToName(8453)).toBe("Base");
  });

  test("returns undefined for an unknown chainId", () => {
    expect(chainIdToName(9999)).toBeUndefined();
  });
});

// ── cn ───────────────────────────────────────────────────────────────────────

describe("cn", () => {
  test("merges class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  test("deduplicates conflicting tailwind classes — last wins", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  test("filters out falsy values", () => {
    expect(cn("foo", false && "bar", undefined, null, "baz")).toBe("foo baz");
  });

  test("handles conditional objects", () => {
    expect(cn({ "text-red-500": true, "text-blue-500": false })).toBe(
      "text-red-500"
    );
  });

  test("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });
});
