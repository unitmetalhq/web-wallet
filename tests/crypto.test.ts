import { describe, test, expect, vi } from "vitest";
import { toBase64, fromBase64, encrypt, decrypt, KDF_ITERATIONS } from "@/lib/crypto";

// ── toBase64 / fromBase64 ────────────────────────────────────────────────────

describe("toBase64", () => {
  test("encodes known bytes to base64", () => {
    expect(toBase64(new Uint8Array([72, 101, 108, 108, 111]))).toBe("SGVsbG8="); // "Hello"
  });

  test("encodes empty array to empty string", () => {
    expect(toBase64(new Uint8Array([]))). toBe("");
  });

  test.each([
    [new Uint8Array([0]), "AA=="],
    [new Uint8Array([255]), "/w=="],
    [new Uint8Array([0, 0, 0]), "AAAA"],
    [new Uint8Array([77, 97, 110]), "TWFu"], // "Man"
  ])("encodes %o to %s", (bytes, expected) => {
    expect(toBase64(bytes)).toBe(expected);
  });
});

describe("fromBase64", () => {
  test("decodes base64 to original bytes", () => {
    const original = new Uint8Array([72, 101, 108, 108, 111]);
    expect(fromBase64("SGVsbG8=")).toEqual(original);
  });

  test("round-trips with toBase64", () => {
    const bytes = new Uint8Array([1, 2, 3, 255, 128, 0]);
    expect(fromBase64(toBase64(bytes))).toEqual(bytes);
  });

  test("round-trips all 256 byte values", () => {
    const all = new Uint8Array(256);
    for (let i = 0; i < 256; i++) all[i] = i;
    expect(fromBase64(toBase64(all))).toEqual(all);
  });
});

// ── KDF_ITERATIONS ───────────────────────────────────────────────────────────

describe("KDF_ITERATIONS", () => {
  test("is at least 600,000 (Bitwarden-equivalent minimum)", () => {
    expect(KDF_ITERATIONS).toBeGreaterThanOrEqual(600_000);
  });

  test("is a finite integer", () => {
    expect(Number.isInteger(KDF_ITERATIONS)).toBe(true);
    expect(Number.isFinite(KDF_ITERATIONS)).toBe(true);
  });
});

// ── encrypt / decrypt ────────────────────────────────────────────────────────

describe("encrypt + decrypt", () => {
  test("round-trips plaintext correctly", async () => {
    const plaintext = "hello world";
    const password = "test-password-123";
    const encrypted = await encrypt(plaintext, password);
    const decrypted = await decrypt(encrypted, password);
    expect(decrypted).toBe(plaintext);
  });

  test("round-trips a JSON payload", async () => {
    const payload = JSON.stringify({ wallets: [], contacts: [], activity: [] });
    const password = "s3cr3t!";
    const encrypted = await encrypt(payload, password);
    const decrypted = await decrypt(encrypted, password);
    expect(decrypted).toBe(payload);
  });

  test("round-trips an empty string", async () => {
    const encrypted = await encrypt("", "password");
    const decrypted = await decrypt(encrypted, "password");
    expect(decrypted).toBe("");
  });

  test.each([
    ["unicode password: emoji", "data", "p4$$w0rd🔑🔐"],
    ["unicode password: CJK", "data", "密码测试"],
    ["unicode password: Arabic", "data", "كلمة المرور"],
    ["unicode payload: mixed scripts", "こんにちは世界 • привет мир • مرحبا", "pass"],
    ["symbols in password", "data", "!@#$%^&*()_+-=[]{}|;':\",./<>?"],
    ["very long password", "data", "a".repeat(256)],
  ])("%s", async (_label, plaintext, password) => {
    const encrypted = await encrypt(plaintext, password);
    const decrypted = await decrypt(encrypted, password);
    expect(decrypted).toBe(plaintext);
  });

  test("round-trips a large payload (~100KB)", async () => {
    const payload = "x".repeat(100_000);
    const encrypted = await encrypt(payload, "pass");
    const decrypted = await decrypt(encrypted, "pass");
    expect(decrypted).toBe(payload);
  });

  test("produces base64-encoded output fields", async () => {
    const encrypted = await encrypt("data", "pass");
    const isBase64 = (s: string) => /^[A-Za-z0-9+/]*={0,2}$/.test(s);
    expect(isBase64(encrypted.kdfSalt)).toBe(true);
    expect(isBase64(encrypted.iv)).toBe(true);
    expect(isBase64(encrypted.data)).toBe(true);
  });

  test("output object has exactly the expected keys", async () => {
    const encrypted = await encrypt("data", "pass");
    expect(Object.keys(encrypted).sort()).toEqual(["data", "iv", "kdfSalt"]);
  });

  test("each encrypt call produces a different ciphertext (random salt+iv)", async () => {
    const a = await encrypt("same plaintext", "same password");
    const b = await encrypt("same plaintext", "same password");
    expect(a.data).not.toBe(b.data);
    expect(a.kdfSalt).not.toBe(b.kdfSalt);
    expect(a.iv).not.toBe(b.iv);
  });

  test("salt is 16 bytes (128-bit)", async () => {
    const encrypted = await encrypt("data", "pass");
    expect(fromBase64(encrypted.kdfSalt).length).toBe(16);
  });

  test("IV is 12 bytes (96-bit, AES-GCM standard)", async () => {
    const encrypted = await encrypt("data", "pass");
    expect(fromBase64(encrypted.iv).length).toBe(12);
  });

  test("decrypt throws with wrong password", async () => {
    const encrypted = await encrypt("secret data", "correct-password");
    await expect(decrypt(encrypted, "wrong-password")).rejects.toThrow();
  });

  test("decrypt throws with tampered ciphertext", async () => {
    const encrypted = await encrypt("secret data", "password");
    const tampered = { ...encrypted, data: toBase64(new Uint8Array(32)) };
    await expect(decrypt(tampered, "password")).rejects.toThrow();
  });

  test("decrypt throws with tampered IV", async () => {
    const encrypted = await encrypt("secret data", "password");
    const tamperedIv = new Uint8Array(12).fill(0);
    const tampered = { ...encrypted, iv: toBase64(tamperedIv) };
    await expect(decrypt(tampered, "password")).rejects.toThrow();
  });

  test("decrypt throws with tampered salt (derives wrong key)", async () => {
    const encrypted = await encrypt("secret data", "password");
    const tamperedSalt = new Uint8Array(16).fill(0);
    const tampered = { ...encrypted, kdfSalt: toBase64(tamperedSalt) };
    await expect(decrypt(tampered, "password")).rejects.toThrow();
  });
});

// ── crypto.subtle availability ───────────────────────────────────────────────

describe("Web Crypto API", () => {
  test("crypto.subtle is available in this environment", () => {
    expect(globalThis.crypto.subtle).toBeDefined();
  });

  test("getRandomValues produces non-deterministic output", () => {
    const a = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const b = globalThis.crypto.getRandomValues(new Uint8Array(16));
    // astronomically unlikely to be equal
    expect(a).not.toEqual(b);
  });

  test("vi.spyOn crypto.getRandomValues can intercept calls (demonstrates mockability)", async () => {
    const fixed = new Uint8Array(16).fill(42);
    const spy = vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation((arr) => {
      (arr as Uint8Array).set(fixed.subarray(0, (arr as Uint8Array).length));
      return arr;
    });

    const a = await encrypt("test", "pass");
    const b = await encrypt("test", "pass");

    // With fixed random, both calls get the same salt and IV
    expect(a.kdfSalt).toBe(b.kdfSalt);
    expect(a.iv).toBe(b.iv);

    spy.mockRestore();

    // After restore, randomness returns
    const c = await encrypt("test", "pass");
    const d = await encrypt("test", "pass");
    expect(c.kdfSalt).not.toBe(d.kdfSalt);
  });
});
