import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
// import { useAtomValue } from "jotai";
import { useSetAtom } from "jotai";
import type { UmKeystore } from "@/types/wallet";
// import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import { Textarea } from "@/components/ui/textarea";
import { walletsAtom } from "@/atoms/walletsAtom";
import { Input } from "@/components/ui/input";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { Keystore, Bytes } from "ox";
import { mnemonicToAccount } from "viem/accounts";
import { Loader2 } from "lucide-react";

export default function ImportWallet() {
  // const wallets = useAtomValue<Array<UmKeystore>>(walletsAtom);
  // const activeWallet = useAtomValue<UmKeystore | null>(activeWalletAtom);
  const setWallets = useSetAtom(walletsAtom);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedKeystore, setSelectedKeystore] = useState<UmKeystore | UmKeystore[] | null>(
    null
  );
  const [pastedKeystore, setPastedKeystore] = useState<string | null>(null);

  // read file when selected
  function readKeystoreFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const keystore = JSON.parse(e.target?.result as string);
      setSelectedKeystore(keystore);
    };
    reader.readAsText(file);
  }

  // import keystore to wallets when Import button is clicked
  function handleImportKeystore() {
    if (selectedKeystore) {
      // Handle both single wallet and array of wallets
      const walletsToImport = Array.isArray(selectedKeystore)
        ? selectedKeystore
        : [selectedKeystore];
      setWallets((prevWallets) => [...prevWallets, ...walletsToImport]);
      setSelectedKeystore(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleImportKeystoreContents() {
    if (pastedKeystore) {
      const parsed = JSON.parse(pastedKeystore);
      // Handle both single wallet and array of wallets
      const walletsToImport = Array.isArray(parsed)
        ? parsed as UmKeystore[]
        : [parsed as UmKeystore];
      setWallets((prevWallets) => [...prevWallets, ...walletsToImport]);
      setPastedKeystore(null);
    }
  }

  const importSecretPhraseForm = useForm({
    defaultValues: {
      name: "",
      password: "",
      secretPhrase: "",
    },
    onSubmit: async ({ value }) => {
      const mnemonic = value.secretPhrase;

      const address = mnemonicToAccount(mnemonic as string).address;

      // Convert the mnemonic phrase to bytes.
      const mnemonicBytes = Bytes.fromString(mnemonic as string);

      // Derive the key using the provided password.
      const [key, opts] = Keystore.pbkdf2({ password: value.password });

      // Encrypt the mnemonic phrase.
      const encrypted = Keystore.encrypt(mnemonicBytes, key, opts);

      // Add the metadata to the encrypted keystore.
      const encryptedWithMeta = {
        ...encrypted,
        meta: {
          type: "secret-phrase",
          note: "the 12 words secret phrase (aka mnemonic phrase) is encrypted with the password using the keystore encryption process",
        },
        name: value.name,
        address: address,
      } as UmKeystore;

      // Add the new wallet to the list of wallets in browser storage.
      setWallets((prevWallets) => [...prevWallets, encryptedWithMeta]);

      // Reset the form.
      importSecretPhraseForm.reset();
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        <h3 className="text-md text-muted-foreground">
          Import with keystore file
        </h3>
        <Input
          type="file"
          ref={fileInputRef}
          accept=".json"
          className="rounded-none border-primary hover:cursor-pointer file:border-r file:border-primary file:border-dotted file:pr-2 file:mr-2 file:hover:cursor-pointer"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              readKeystoreFile(file);
            }
          }}
        />
        <Button
          onClick={handleImportKeystore}
          disabled={!selectedKeystore}
          size="sm"
          className="w-fit rounded-none hover:cursor-pointer"
        >
          Import
        </Button>
        <div className="border-t-2 border-primary border-dotted" />
        <h3 className="text-md text-muted-foreground">
          Import with keystore contents
        </h3>
        <Textarea
          placeholder="Paste your keystore file content here"
          className="rounded-none border-primary"
          onChange={(e) => setPastedKeystore(e.target.value)}
          value={pastedKeystore || ""}
        />
        <Button
          onClick={handleImportKeystoreContents}
          disabled={!pastedKeystore}
          size="sm"
          className="w-fit rounded-none hover:cursor-pointer"
        >
          Import
        </Button>
        <div className="border-t-2 border-primary border-dotted" />
        <h3 className="text-md text-muted-foreground">
          Import with secret phrase
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            importSecretPhraseForm.handleSubmit();
          }}
        >
          <div className="flex flex-col gap-2">
            <importSecretPhraseForm.Field
              name="name"
              validators={{
                onChange: ({ value }) =>
                  !value ? "Please enter a name" : undefined,
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value || ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    type="text"
                    placeholder="Wallet name"
                    className="rounded-none border-primary"
                    required
                  />
                  <NameFieldInfo field={field} />
                </div>
              )}
            </importSecretPhraseForm.Field>
            <importSecretPhraseForm.Field
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
                    placeholder="Strong password"
                    className="rounded-none border-primary"
                    required
                  />
                  <PasswordFieldInfo field={field} />
                </div>
              )}
            </importSecretPhraseForm.Field>
            <importSecretPhraseForm.Field
              name="secretPhrase"
              validators={{
                onChange: ({ value }) =>
                  !value ? "Please enter a secret phrase" : undefined,
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value || ""}
                    className="rounded-none border-primary"
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Enter your secret phrase here"
                    required
                  />
                  <SecretPhraseFieldInfo field={field} />
                </div>
              )}
            </importSecretPhraseForm.Field>
            <importSecretPhraseForm.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <div className="flex flex-row gap-2">
                  <Button
                    className="hover:cursor-pointer rounded-none"
                    type="submit"
                    disabled={!canSubmit || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </>
                    ) : (
                      <>Create</>
                    )}
                  </Button>
                  <Button
                    type="reset"
                    variant="outline"
                    onClick={(e) => {
                      // Avoid unexpected resets of form elements (especially <select> elements)
                      e.preventDefault();
                      importSecretPhraseForm.reset();
                    }}
                    className="hover:cursor-pointer rounded-none border-secondary"
                  >
                    Reset
                  </Button>
                </div>
              )}
            </importSecretPhraseForm.Subscribe>
          </div>
        </form>
      </div>
    </div>
  );
}

function NameFieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <>
      {!field.state.meta.isTouched ? (
        <em>Please enter a name</em>
      ) : field.state.meta.isTouched && !field.state.meta.isValid ? (
        <em
          className={`${
            field.state.meta.errors.join(",") === "Please enter a name"
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

function PasswordFieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <>
      {!field.state.meta.isTouched ? (
        <em>Please enter a password</em>
      ) : field.state.meta.isTouched && !field.state.meta.isValid ? (
        <em
          className={`${
            field.state.meta.errors.join(",") === "Please enter a password"
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

function SecretPhraseFieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <>
      {!field.state.meta.isTouched ? (
        <em>Please enter a secret phrase</em>
      ) : field.state.meta.isTouched && !field.state.meta.isValid ? (
        <em
          className={`${
            field.state.meta.errors.join(",") === "Please enter a secret phrase"
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
