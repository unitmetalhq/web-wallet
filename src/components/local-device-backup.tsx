import { useState } from "react";
import { useAtomValue } from "jotai";
import { useLiveQuery } from "dexie-react-hooks";
import { walletsAtom } from "@/atoms/walletsAtom";
import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import { contactsAtom } from "@/atoms/contactsAtom";
import { settingsAtom } from "@/atoms/settingsAtom";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Download } from "lucide-react";

// ── Backup file format ───────────────────────────────────────────────────────
//
// Standard JSON file. Self-describing: all parameters required for decryption
// are stored in plaintext alongside the ciphertext.
//
// Encryption: PBKDF2-SHA256 (600,000 iterations) → AES-GCM-256
//   - Equivalent to Bitwarden's KDF strength
//   - AES-GCM provides authenticated encryption (confidentiality + integrity)
//     in a single primitive — simpler and equally secure vs AES-CBC + HMAC
//
// To decrypt with any language/tool:
//   1. base64-decode encryption.kdfSalt, derive a 256-bit key via
//      PBKDF2(password, salt, 600000, SHA-256)
//   2. base64-decode encryption.iv and data
//   3. AES-GCM-256 decrypt(key, iv, data)
//   4. JSON.parse the resulting plaintext

interface UmWalletBackup {
  format: "um-wallet-backup";
  version: 1;
  createdAt: string;         // ISO 8601
  email?: string;            // optional, stored in plaintext for future use
  encryption: {
    kdf: "PBKDF2";
    kdfHash: "SHA-256";
    kdfIterations: number;
    kdfSalt: string;         // base64
    algorithm: "AES-GCM-256";
    iv: string;              // base64
  };
  data: string;              // base64 AES-GCM ciphertext (plaintext is JSON)
}

import { KDF_ITERATIONS, encrypt } from "@/lib/crypto";

// ── Component ────────────────────────────────────────────────────────────────

export default function BackupAll() {
  const wallets = useAtomValue(walletsAtom);
  const activeWallet = useAtomValue(activeWalletAtom);
  const contacts = useAtomValue(contactsAtom);
  const settings = useAtomValue(settingsAtom);
  const activity = useLiveQuery(() => db.activity.toArray(), []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleBackup() {
    setError(null);

    if (!password) {
      setError("Password is required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const plaintext = JSON.stringify({
        wallets,
        activeWalletAddress: activeWallet?.address ?? null,
        contacts,
        settings,
        activity: activity ?? [],
      });

      const { kdfSalt, iv, data } = await encrypt(plaintext, password);

      const backup: UmWalletBackup = {
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

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `unitmetal-web-wallet-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setPassword("");
      setConfirmPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Encryption failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col border-2 border-primary gap-2 pb-8 h-fit">
      <div className="flex flex-row justify-between items-center bg-primary text-secondary pl-1">
        <h1 className="text-md font-bold">Local device backup</h1>
      </div>

      <div className="flex flex-col gap-4 px-4 py-2">
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <p>
            Exports all wallets, contacts, settings, and activity into an encrypted <span className="font-mono">.json</span> backup.
            Encrypted with AES-GCM 256-bit + PBKDF2 (600,000 iterations).
          </p>
          <p>Keep your password safe — it cannot be recovered.</p>
        </div>

        <div className="grid grid-cols-2 gap-1 text-xs border border-border p-3">
          <span className="text-muted-foreground">Wallets</span>
          <span className="font-mono">{wallets.length}</span>
          <span className="text-muted-foreground">Contacts</span>
          <span className="font-mono">{contacts.length}</span>
          <span className="text-muted-foreground">Activity records</span>
          <span className="font-mono">{activity?.length ?? 0}</span>
        </div>

        <div className="flex flex-col gap-2">
          <Input
            type="password"
            placeholder="Backup password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-none border-primary text-base"
          />
          <Input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-none border-primary text-base"
          />
          <Input
            type="email"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-none border-primary text-base"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <Button
          type="button"
          className="rounded-none hover:cursor-pointer"
          onClick={handleBackup}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download backup
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
