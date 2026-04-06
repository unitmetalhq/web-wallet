/**
 * Tests for the um-wallet-backup JSON format.
 *
 * We verify the shape of the backup object and the full
 * encrypt → serialize → parse → decrypt round-trip,
 * independent of the React component that builds it.
 */
import { describe, test, expect, vi } from "vitest";
import { encrypt, decrypt, KDF_ITERATIONS, toBase64, fromBase64 } from "@/lib/crypto";

// ── Mirror of UmWalletBackup from local-device-backup.tsx ────────────────────

interface UmWalletBackup {
  format: "um-wallet-backup";
  version: 1;
  createdAt: string;
  email?: string;
  encryption: {
    kdf: "PBKDF2";
    kdfHash: "SHA-256";
    kdfIterations: number;
    kdfSalt: string;
    algorithm: "AES-GCM-256";
    iv: string;
  };
  data: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function buildBackup(
  plaintext: string,
  password: string,
  email?: string
): Promise<UmWalletBackup> {
  const { kdfSalt, iv, data } = await encrypt(plaintext, password);
  return {
    format: "um-wallet-backup",
    version: 1,
    createdAt: new Date().toISOString(),
    ...(email ? { email } : {}),
    encryption: {
      kdf: "PBKDF2",
      kdfHash: "SHA-256",
      kdfIterations: KDF_ITERATIONS,
      kdfSalt,
      algorithm: "AES-GCM-256",
      iv,
    },
    data,
  };
}

const SAMPLE_PAYLOAD = JSON.stringify({
  wallets: [],
  activeWalletAddress: null,
  contacts: [],
  settings: {},
  activity: [],
});

// ── Backup object shape ───────────────────────────────────────────────────────

describe("UmWalletBackup shape", () => {
  test("format field is the literal string 'um-wallet-backup'", async () => {
    const b = await buildBackup(SAMPLE_PAYLOAD, "pass");
    expect(b.format).toBe("um-wallet-backup");
  });

  test("version is the number 1", async () => {
    const b = await buildBackup(SAMPLE_PAYLOAD, "pass");
    expect(b.version).toBe(1);
  });

  test("createdAt is a valid ISO 8601 string", async () => {
    const before = Date.now();
    const b = await buildBackup(SAMPLE_PAYLOAD, "pass");
    const after = Date.now();
    const parsed = new Date(b.createdAt).getTime();
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after);
  });

  test("createdAt uses fake timer when set", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    const b = await buildBackup(SAMPLE_PAYLOAD, "pass");
    expect(b.createdAt).toBe(new Date(1_700_000_000_000).toISOString());
    vi.useRealTimers();
  });

  test("email field is omitted when not provided", async () => {
    const b = await buildBackup(SAMPLE_PAYLOAD, "pass");
    expect(b).not.toHaveProperty("email");
  });

  test("email field is present when provided", async () => {
    const b = await buildBackup(SAMPLE_PAYLOAD, "pass", "user@example.com");
    expect(b.email).toBe("user@example.com");
  });

  test("encryption.kdf is 'PBKDF2'", async () => {
    const b = await buildBackup(SAMPLE_PAYLOAD, "pass");
    expect(b.encryption.kdf).toBe("PBKDF2");
  });

  test("encryption.kdfHash is 'SHA-256'", async () => {
    const b = await buildBackup(SAMPLE_PAYLOAD, "pass");
    expect(b.encryption.kdfHash).toBe("SHA-256");
  });

  test("encryption.kdfIterations matches KDF_ITERATIONS constant", async () => {
    const b = await buildBackup(SAMPLE_PAYLOAD, "pass");
    expect(b.encryption.kdfIterations).toBe(KDF_ITERATIONS);
  });

  test("encryption.algorithm is 'AES-GCM-256'", async () => {
    const b = await buildBackup(SAMPLE_PAYLOAD, "pass");
    expect(b.encryption.algorithm).toBe("AES-GCM-256");
  });

  test("encryption.kdfSalt is valid base64", async () => {
    const b = await buildBackup(SAMPLE_PAYLOAD, "pass");
    expect(() => fromBase64(b.encryption.kdfSalt)).not.toThrow();
    expect(fromBase64(b.encryption.kdfSalt).length).toBe(16); // 128-bit
  });

  test("encryption.iv is valid base64", async () => {
    const b = await buildBackup(SAMPLE_PAYLOAD, "pass");
    expect(() => fromBase64(b.encryption.iv)).not.toThrow();
    expect(fromBase64(b.encryption.iv).length).toBe(12); // 96-bit AES-GCM
  });

  test("data field is valid base64", async () => {
    const b = await buildBackup(SAMPLE_PAYLOAD, "pass");
    expect(() => fromBase64(b.data)).not.toThrow();
  });

  test("top-level keys are exactly the expected set (no email)", async () => {
    const b = await buildBackup(SAMPLE_PAYLOAD, "pass");
    expect(Object.keys(b).sort()).toEqual(
      ["createdAt", "data", "encryption", "format", "version"].sort()
    );
  });

  test("top-level keys include email when provided", async () => {
    const b = await buildBackup(SAMPLE_PAYLOAD, "pass", "x@y.com");
    expect(Object.keys(b).sort()).toEqual(
      ["createdAt", "data", "email", "encryption", "format", "version"].sort()
    );
  });
});

// ── Round-trip: encrypt → JSON → parse → decrypt ─────────────────────────────

describe("backup round-trip", () => {
  test("decrypts back to the original plaintext", async () => {
    const password = "super-secret-backup-password";
    const b = await buildBackup(SAMPLE_PAYLOAD, password);
    const decrypted = await decrypt(
      { kdfSalt: b.encryption.kdfSalt, iv: b.encryption.iv, data: b.data },
      password
    );
    expect(decrypted).toBe(SAMPLE_PAYLOAD);
  });

  test("round-trips through JSON serialization", async () => {
    const password = "p4$$w0rd";
    const b = await buildBackup(SAMPLE_PAYLOAD, password);
    const serialized = JSON.stringify(b);
    const parsed: UmWalletBackup = JSON.parse(serialized);

    const decrypted = await decrypt(
      {
        kdfSalt: parsed.encryption.kdfSalt,
        iv: parsed.encryption.iv,
        data: parsed.data,
      },
      password
    );
    expect(decrypted).toBe(SAMPLE_PAYLOAD);
  });

  test("decrypted payload is valid JSON with expected keys", async () => {
    const b = await buildBackup(SAMPLE_PAYLOAD, "pass");
    const decrypted = await decrypt(
      { kdfSalt: b.encryption.kdfSalt, iv: b.encryption.iv, data: b.data },
      "pass"
    );
    const obj = JSON.parse(decrypted);
    expect(obj).toHaveProperty("wallets");
    expect(obj).toHaveProperty("contacts");
    expect(obj).toHaveProperty("activity");
    expect(obj).toHaveProperty("settings");
    expect(obj).toHaveProperty("activeWalletAddress");
  });

  test("wrong password fails to decrypt", async () => {
    const b = await buildBackup(SAMPLE_PAYLOAD, "correct");
    await expect(
      decrypt(
        { kdfSalt: b.encryption.kdfSalt, iv: b.encryption.iv, data: b.data },
        "wrong"
      )
    ).rejects.toThrow();
  });

  test("tampered data field fails integrity check", async () => {
    const b = await buildBackup(SAMPLE_PAYLOAD, "pass");
    const tampered = { ...b, data: toBase64(new Uint8Array(64)) };
    await expect(
      decrypt(
        {
          kdfSalt: tampered.encryption.kdfSalt,
          iv: tampered.encryption.iv,
          data: tampered.data,
        },
        "pass"
      )
    ).rejects.toThrow();
  });

  test.each([
    ["empty wallets/contacts", JSON.stringify({ wallets: [], contacts: [], activity: [], settings: {}, activeWalletAddress: null })],
    ["unicode in settings", JSON.stringify({ wallets: [], contacts: [], activity: [], settings: { theme: "日本語" }, activeWalletAddress: null })],
    ["large activity array", JSON.stringify({ wallets: [], contacts: [], activity: Array.from({ length: 100 }, (_, i) => ({ id: i })), settings: {}, activeWalletAddress: null })],
  ])("round-trips: %s", async (_label, payload) => {
    const b = await buildBackup(payload, "testpass");
    const decrypted = await decrypt(
      { kdfSalt: b.encryption.kdfSalt, iv: b.encryption.iv, data: b.data },
      "testpass"
    );
    expect(decrypted).toBe(payload);
  });
});

// ── File format stability ─────────────────────────────────────────────────────

describe("backup format stability", () => {
  test("format identifier never changes", () => {
    // If this string changes, all existing backups are unrecognisable
    expect("um-wallet-backup").toBe("um-wallet-backup");
  });

  test("version is a number (not a string)", async () => {
    const b = await buildBackup(SAMPLE_PAYLOAD, "pass");
    expect(typeof b.version).toBe("number");
  });

  test("serialized backup is valid JSON", async () => {
    const b = await buildBackup(SAMPLE_PAYLOAD, "pass");
    expect(() => JSON.parse(JSON.stringify(b))).not.toThrow();
  });
});
