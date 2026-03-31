import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { useAtomValue } from "jotai";
import type { UmKeystore } from "@/types/wallet";
import { walletsAtom } from "@/atoms/walletsAtom";
import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Keystore, Bytes } from "ox";
import CopyButton from "@/components/copy-button";

export default function ExportWallet() {
  const wallets = useAtomValue<Array<UmKeystore>>(walletsAtom);
  const activeWallet = useAtomValue<UmKeystore | null>(activeWalletAtom);
  const [exportedSecretPhrase, setExportedSecretPhrase] = useState<
    string | null
  >(null);

  function downloadAllKeystores() {
    const blob = new Blob([JSON.stringify(wallets, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unitmetal-wallets-DO_NOT_DELETE.json`;
    a.click();
  }

  function downloadActiveKeystore() {
    const blob = new Blob([JSON.stringify(activeWallet, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeWallet?.name.replace(/ /g, "-")}-DO_NOT_DELETE.json`;
    a.click();
  }

  const exportActiveWalletForm = useForm({
    defaultValues: {
      password: "",
    },
    onSubmit: async ({ value }) => {
      // Parse the keystore.
      const keystore = activeWallet;

      // Derive the key using your password.
      const key = Keystore.toKey(keystore as Keystore.Keystore, {
        password: value.password,
      });

      // Decrypt the private key.
      const mnemonicBytes = Keystore.decrypt(
        keystore as Keystore.Keystore,
        key
      );

      const mnemonicPhrase = Bytes.toString(Bytes.fromHex(mnemonicBytes));

      // Set the output decrypted mnemonic phrase.
      setExportedSecretPhrase(mnemonicPhrase);

      // Reset the form.
      exportActiveWalletForm.reset();
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        <h3 className="text-md text-muted-foreground">
          {activeWallet
            ? `Download backup keystore for the current wallet`
            : "Select a wallet to download the backup keystore"}
        </h3>
        <Button
          onClick={downloadActiveKeystore}
          size="sm"
          className="w-fit rounded-none hover:cursor-pointer"
          disabled={!activeWallet}
        >
          Download
        </Button>
        <div className="border-t-2 border-primary border-dotted" />
        <h3 className="text-md text-muted-foreground">
          Download backup keystores for all wallets
        </h3>
        <Button
          onClick={downloadAllKeystores}
          size="sm"
          className="w-fit rounded-none hover:cursor-pointer"
        >
          Download
        </Button>
        <div className="border-t-2 border-primary border-dotted" />
        <h3 className="text-md text-muted-foreground">
          {activeWallet
            ? "Export and reveal current wallet secret phrase"
            : "Select a wallet to export and reveal the secret phrase"}
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            exportActiveWalletForm.handleSubmit();
          }}
        >
          <div className="flex flex-col gap-2">
            <exportActiveWalletForm.Field
              name="password"
              validators={{
                onChange: ({ value }) =>
                  !value ? "Please enter a password" : undefined,
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value || ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    type="password"
                    placeholder="Password"
                    className="rounded-none border-primary"
                    required
                  />
                  <PasswordFieldInfo field={field} />
                </div>
              )}
            </exportActiveWalletForm.Field>
            <exportActiveWalletForm.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <div className="flex flex-row gap-2">
                  <Button
                    size="sm"
                    className="hover:cursor-pointer rounded-none"
                    type="submit"
                    disabled={!canSubmit || isSubmitting || !activeWallet}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </>
                    ) : (
                      <>Export</>
                    )}
                  </Button>
                  <Button
                    type="reset"
                    variant="outline"
                    onClick={(e) => {
                      // Avoid unexpected resets of form elements (especially <select> elements)
                      e.preventDefault();
                      exportActiveWalletForm.reset();
                      setExportedSecretPhrase("");
                    }}
                    className="hover:cursor-pointer rounded-none border-secondary"
                  >
                    Reset
                  </Button>
                </div>
              )}
            </exportActiveWalletForm.Subscribe>
          </div>
        </form>
        <div className="flex flex-col gap-2">
          <Textarea
            value={exportedSecretPhrase || ""}
            placeholder="Your exported secret phrase"
            className="rounded-none border-primary"
            readOnly
            rows={10}
          />
          <div className="self-end">
            <CopyButton text={exportedSecretPhrase || ""} variant="outline" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordFieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <>
      {!field.state.meta.isTouched ? (
        <em>Please enter your wallet password</em>
      ) : field.state.meta.isTouched && !field.state.meta.isValid ? (
        <em
          className={`${
            field.state.meta.errors.join(",") ===
            "Please enter your wallet password"
              ? ""
              : "text-red-400"
          }`}
        >
          {field.state.meta.errors.join(",")}
        </em>
      ) : (
        <em className="text-green-500">ok!</em>
      )}
      {field.state.meta.isValidating ? "Validating..." : null}
    </>
  );
}
