export const KDF_ITERATIONS = 600_000;

export function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

export function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encrypt(
  plaintext: string,
  password: string
): Promise<{ kdfSalt: string; iv: string; data: string }> {
  const enc = new TextEncoder();
  const kdfSalt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: kdfSalt, iterations: KDF_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );

  return {
    kdfSalt: toBase64(kdfSalt),
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(ciphertext)),
  };
}

export async function decrypt(
  encryptedData: { kdfSalt: string; iv: string; data: string },
  password: string
): Promise<string> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: fromBase64(encryptedData.kdfSalt),
      iterations: KDF_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(encryptedData.iv) },
    key,
    fromBase64(encryptedData.data)
  );

  return dec.decode(plaintext);
}
