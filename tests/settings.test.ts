import { describe, test, expect } from "vitest";
import { validateUrl } from "@/lib/settings";

// ── validateUrl ───────────────────────────────────────────────────────────────

describe("validateUrl", () => {
  // ── Valid URLs ───────────────────────────────────────────────────────────────

  test("returns null for a valid https URL", () => {
    expect(validateUrl("https://eth-mainnet.g.alchemy.com/v2/key")).toBeNull();
  });

  test("returns null for a valid http URL", () => {
    expect(validateUrl("http://localhost:8545")).toBeNull();
  });

  test("returns null for a URL with query params", () => {
    expect(validateUrl("https://rpc.example.com/v2?token=abc")).toBeNull();
  });

  test("returns null for a URL with trailing slash", () => {
    expect(validateUrl("https://rpc.example.com/")).toBeNull();
  });

  test("trims whitespace before validating", () => {
    expect(validateUrl("  https://rpc.example.com  ")).toBeNull();
  });

  // ── Empty / blank input ──────────────────────────────────────────────────────

  test("returns error for empty string", () => {
    expect(validateUrl("")).toBe("RPC URL is required");
  });

  test("returns error for whitespace-only string", () => {
    expect(validateUrl("   ")).toBe("RPC URL is required");
  });

  // ── Invalid protocol ─────────────────────────────────────────────────────────

  test("returns error for ws:// protocol", () => {
    expect(validateUrl("ws://rpc.example.com")).toBe(
      "RPC URL must use http or https"
    );
  });

  test("returns error for wss:// protocol", () => {
    expect(validateUrl("wss://rpc.example.com")).toBe(
      "RPC URL must use http or https"
    );
  });

  test("returns error for ftp:// protocol", () => {
    expect(validateUrl("ftp://rpc.example.com")).toBe(
      "RPC URL must use http or https"
    );
  });

  // ── Malformed URLs ───────────────────────────────────────────────────────────

  test("returns error for a plain string with no protocol", () => {
    expect(validateUrl("rpc.example.com")).toBe("Invalid URL");
  });

  test("returns error for a string with just slashes", () => {
    expect(validateUrl("//rpc.example.com")).toBe("Invalid URL");
  });

  test("returns error for a random word", () => {
    expect(validateUrl("notaurl")).toBe("Invalid URL");
  });

  test("returns error for a URL with no host", () => {
    expect(validateUrl("https://")).toBe("Invalid URL");
  });

  // ── Return type ───────────────────────────────────────────────────────────────

  test("valid URL returns null (not a string)", () => {
    expect(validateUrl("https://rpc.example.com")).toBeNull();
  });

  test("invalid URL always returns a string", () => {
    for (const bad of ["", "   ", "ws://x.com", "notaurl"]) {
      expect(typeof validateUrl(bad)).toBe("string");
    }
  });
});
