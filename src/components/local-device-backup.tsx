import { useState } from "react";
import { useAtomValue } from "jotai";
import { useLiveQuery } from "dexie-react-hooks";
import { walletsAtom } from "@/atoms/walletsAtom";
import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import { contactsAtom } from "@/atoms/contactsAtom";
import { settingsAtom } from "@/atoms/settingsAtom";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { Loader2, Download, Eye, EyeOff } from "lucide-react";

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

// ── Export tab ───────────────────────────────────────────────────────────────

function ExportBackup() {
  const wallets = useAtomValue(walletsAtom);
  const activeWallet = useAtomValue(activeWalletAtom);
  const contacts = useAtomValue(contactsAtom);
  const settings = useAtomValue(settingsAtom);
  const activity = useLiveQuery(() => db.activity.toArray(), []);

  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    defaultValues: {
      password: "",
    },
    onSubmit: async ({ value }) => {
      const plaintext = JSON.stringify({
        wallets,
        activeWalletAddress: activeWallet?.address ?? null,
        contacts,
        settings,
        activity: activity ?? [],
      });

      const { kdfSalt, iv, data } = await encrypt(plaintext, value.password);

      const backup: UmWalletBackup = {
        format: "um-wallet-backup",
        version: 1,
        createdAt: new Date().toISOString(),
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

      form.reset();
    },
  });

  return (
    <div className="flex flex-col gap-4">
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="flex flex-col gap-2"
      >
        <form.Field
          name="password"
          validators={{
            onChange: ({ value }) =>
              !value ? "Please enter a password" : undefined,
          }}
        >
          {(field) => (
            <div className="flex flex-col gap-1">
              <InputGroup className="border-primary">
                <InputGroupInput
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="Backup password"
                  className="text-base"
                  required
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="hover:cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldInfo field={field} placeholder="Please enter a password" />
            </div>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              className="rounded-none hover:cursor-pointer"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download backup
                </>
              )}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}

// ── Import tab ───────────────────────────────────────────────────────────────

function ImportBackup() {
  return (
    <p className="text-sm text-muted-foreground">Coming soon.</p>
  );
}

// ── Root component ───────────────────────────────────────────────────────────

export default function LocalDeviceBackup() {
  return (
    <div className="flex flex-col border-2 border-primary gap-2 pb-8 h-fit">
      <div className="flex flex-row justify-between items-center bg-primary text-secondary pl-1">
        <h1 className="text-md font-bold">Local device backup</h1>
      </div>
      <div className="px-4 py-2">
        <Tabs defaultValue="export" className="w-full">
          <TabsList className="border-primary border rounded-none">
            <TabsTrigger className="rounded-none" value="export">Export</TabsTrigger>
            <TabsTrigger className="rounded-none" value="import">Import</TabsTrigger>
          </TabsList>
          <TabsContent value="export">
            <ExportBackup />
          </TabsContent>
          <TabsContent value="import">
            <ImportBackup />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function FieldInfo({ field, placeholder }: { field: AnyFieldApi; placeholder: string }) {
  return (
    <>
      {!field.state.meta.isTouched ? (
        <em className="text-xs text-muted-foreground">{placeholder}</em>
      ) : !field.state.meta.isValid ? (
        <em className="text-xs text-red-400">{field.state.meta.errors.join(", ")}</em>
      ) : (
        <em className="text-xs text-green-500">ok!</em>
      )}
    </>
  );
}
