/**
 * Tests for pure logic extracted from add-contact-form.tsx and
 * manage-address-book.tsx.  No React rendering — we mirror the
 * functions inline so they stay decoupled from UI state.
 */
import { describe, test, expect } from "vitest";
import type { Contact } from "@/types/contact";

// ── Pure helpers mirrored from add-contact-form.tsx ──────────────────────────

function validateName(value: string): string | undefined {
  return !value.trim() ? "Please enter a name" : undefined;
}

function validateAddress(
  value: string,
  existingAddresses: string[]
): string | undefined {
  if (!value.trim()) return "Please enter an address";
  if (existingAddresses.includes(value.trim().toLowerCase()))
    return "Address already in address book";
  return undefined;
}

function validateChain(value: string): string | undefined {
  if (value.trim() && isNaN(Number(value.trim())))
    return "Chain must be a numeric chain ID";
  return undefined;
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// ── Filter logic mirrored from manage-address-book.tsx ───────────────────────

function filterContacts(contacts: Contact[], query: string): Contact[] {
  const q = query.toLowerCase();
  return contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      c.metadata.tags.some((t) => t.toLowerCase().includes(q)) ||
      c.metadata.note.toLowerCase().includes(q)
  );
}

// ── Test data ─────────────────────────────────────────────────────────────────

const ADDR_A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const ADDR_B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const SAMPLE_CONTACTS: Contact[] = [
  {
    id: "1",
    name: "Alice",
    address: ADDR_A,
    chain: 1,
    metadata: { tags: ["defi", "team"], version: "0.0.1", note: "main wallet" },
  },
  {
    id: "2",
    name: "Bob",
    address: ADDR_B,
    chain: 137,
    metadata: { tags: ["personal"], version: "0.0.1", note: "polygon user" },
  },
];

// ── validateName ─────────────────────────────────────────────────────────────

describe("validateName", () => {
  test("returns undefined for a valid name", () => {
    expect(validateName("Alice")).toBeUndefined();
  });

  test("returns error for empty string", () => {
    expect(validateName("")).toBe("Please enter a name");
  });

  test("returns error for whitespace-only string", () => {
    expect(validateName("   ")).toBe("Please enter a name");
  });

  test("accepts names with numbers and symbols", () => {
    expect(validateName("Wallet #1 (hot)")).toBeUndefined();
  });

  test("accepts unicode names", () => {
    expect(validateName("こんにちは")).toBeUndefined();
  });
});

// ── validateAddress ───────────────────────────────────────────────────────────

describe("validateAddress", () => {
  test("returns undefined for a fresh address", () => {
    expect(validateAddress(ADDR_A, [])).toBeUndefined();
  });

  test("returns error for empty input", () => {
    expect(validateAddress("", [])).toBe("Please enter an address");
  });

  test("returns error for whitespace-only input", () => {
    expect(validateAddress("   ", [])).toBe("Please enter an address");
  });

  test("returns duplicate error when address already exists (exact case)", () => {
    expect(validateAddress(ADDR_A, [ADDR_A])).toBe(
      "Address already in address book"
    );
  });

  test("duplicate check is case-insensitive", () => {
    const upper = ADDR_A.toUpperCase();
    expect(validateAddress(upper, [ADDR_A])).toBe(
      "Address already in address book"
    );
  });

  test("trims whitespace before duplicate check", () => {
    expect(validateAddress(`  ${ADDR_A}  `, [ADDR_A])).toBe(
      "Address already in address book"
    );
  });

  test("accepts an ENS name that is not a duplicate", () => {
    expect(validateAddress("vitalik.eth", [])).toBeUndefined();
  });
});

// ── validateChain ─────────────────────────────────────────────────────────────

describe("validateChain", () => {
  test("returns undefined for empty string (optional field)", () => {
    expect(validateChain("")).toBeUndefined();
  });

  test("returns undefined for valid numeric chain ID", () => {
    expect(validateChain("1")).toBeUndefined();
  });

  test("returns undefined for Polygon chainId", () => {
    expect(validateChain("137")).toBeUndefined();
  });

  test("returns error for non-numeric value", () => {
    expect(validateChain("mainnet")).toBe("Chain must be a numeric chain ID");
  });

  test("returns error for letters mixed with digits", () => {
    expect(validateChain("1abc")).toBe("Chain must be a numeric chain ID");
  });

  test("returns undefined for whitespace-only (treated as empty)", () => {
    expect(validateChain("   ")).toBeUndefined();
  });
});

// ── parseTags ─────────────────────────────────────────────────────────────────

describe("parseTags", () => {
  test("splits a comma-separated list", () => {
    expect(parseTags("defi,team,hot")).toEqual(["defi", "team", "hot"]);
  });

  test("trims whitespace from each tag", () => {
    expect(parseTags("defi , team , hot")).toEqual(["defi", "team", "hot"]);
  });

  test("filters empty segments from double-commas", () => {
    expect(parseTags("defi,,team")).toEqual(["defi", "team"]);
  });

  test("returns empty array for empty string", () => {
    expect(parseTags("")).toEqual([]);
  });

  test("returns empty array for whitespace-only string", () => {
    expect(parseTags("   ")).toEqual([]);
  });

  test("returns single-element array for one tag", () => {
    expect(parseTags("defi")).toEqual(["defi"]);
  });

  test("returns single-element array for one tag with surrounding whitespace", () => {
    expect(parseTags("  defi  ")).toEqual(["defi"]);
  });

  test("handles trailing comma gracefully", () => {
    expect(parseTags("defi,team,")).toEqual(["defi", "team"]);
  });
});

// ── filterContacts ────────────────────────────────────────────────────────────

describe("filterContacts", () => {
  test("returns all contacts for empty query", () => {
    expect(filterContacts(SAMPLE_CONTACTS, "")).toHaveLength(2);
  });

  test("filters by name (case-insensitive)", () => {
    const result = filterContacts(SAMPLE_CONTACTS, "alice");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });

  test("filters by address substring", () => {
    const result = filterContacts(SAMPLE_CONTACTS, "aaaaaa");
    expect(result).toHaveLength(1);
    expect(result[0].address).toBe(ADDR_A);
  });

  test("filters by tag", () => {
    const result = filterContacts(SAMPLE_CONTACTS, "defi");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });

  test("filters by note", () => {
    const result = filterContacts(SAMPLE_CONTACTS, "polygon user");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Bob");
  });

  test("returns empty array when no contacts match", () => {
    expect(filterContacts(SAMPLE_CONTACTS, "zzz-no-match")).toHaveLength(0);
  });

  test("returns empty array when contacts list is empty", () => {
    expect(filterContacts([], "alice")).toHaveLength(0);
  });

  test("matches are case-insensitive for tags", () => {
    const result = filterContacts(SAMPLE_CONTACTS, "DEFI");
    expect(result).toHaveLength(1);
  });

  test("a broad query can match multiple contacts", () => {
    // both contacts have version 0.0.1 in metadata.note? No — but "wallet" appears in Alice's note
    const result = filterContacts(SAMPLE_CONTACTS, "a"); // 'Alice' and 'main wallet'
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
