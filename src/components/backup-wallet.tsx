import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { Keystore, Bytes } from "ox";
import type { UmKeystore } from "@/types/wallet";
import { mnemonicToAccount } from "viem/accounts";
import { Textarea } from "@/components/ui/textarea";
import CopyButton from "@/components/copy-button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function BackupWallet() {
  const [outputBackupKeystore, setOutputBackupKeystore] =
    useState<UmKeystore | null>(null);

  const [outputDecryptedMnemonicPhrase, setOutputDecryptedMnemonicPhrase] =
    useState<string | null>(null);

  // backup any mnemonic/seed phrase
  const anySeedPhraseBackupForm = useForm({
    defaultValues: {
      name: "",
      mnemonicPhrase: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      // Derive the address from the seed phrase.
      const address = mnemonicToAccount(value.mnemonicPhrase).address;

      // Convert the mnemonic phrase to bytes.
      const mnemonicBytes = Bytes.fromString(value.mnemonicPhrase);

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

      // Set the output backup keystore.
      setOutputBackupKeystore(encryptedWithMeta);
      // Reset the form.
      anySeedPhraseBackupForm.reset();
    },
  });

  // decrypt any keystore
  const anySeedPhraseDecryptForm = useForm({
    defaultValues: {
      keystore: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      // Parse the keystore.
      const keystore = JSON.parse(value.keystore);
      
      // Derive the key using your password.
      const key = Keystore.toKey(keystore, { password: value.password })
      
      // Decrypt the private key.
      const mnemonicBytes = Keystore.decrypt(keystore, key);

      const mnemonicPhrase = Bytes.toString(Bytes.fromHex(mnemonicBytes));

      // Set the output decrypted mnemonic phrase.
      setOutputDecryptedMnemonicPhrase(mnemonicPhrase);
    },
  });

  // download the backup keystore
  function downloadBackupKeystore() {
    const blob = new Blob([JSON.stringify(outputBackupKeystore, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${outputBackupKeystore?.name.replace(
      / /g,
      "-"
    )}-DO_NOT_DELETE.json`;
    a.click();
  }

  // clear the backup keystore
  function clearBackupKeystore() {
    setOutputBackupKeystore(null);
  }

  // clear the decrypted mnemonic phrase
  function clearDecryptedMnemonicPhrase() {
    setOutputDecryptedMnemonicPhrase(null);
  }

  return (
    <div className="flex flex-col border-2 border-primary gap-2 pb-8">
      <div className="flex flex-row justify-between items-center bg-primary text-secondary pl-1">
        <h1 className="text-md font-bold">Backup</h1>
      </div>
      <div className="flex flex-col gap-4 px-4 py-2">
        <Tabs defaultValue="encrypt" className="w-full">
          <TabsList className="border-primary border rounded-none">
            <TabsTrigger className="rounded-none" value="encrypt">
              Encrypt
            </TabsTrigger>
            <TabsTrigger className="rounded-none" value="decrypt">
              Decrypt
            </TabsTrigger>
          </TabsList>
          <TabsContent value="encrypt" className="flex flex-col gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                anySeedPhraseBackupForm.handleSubmit();
              }}
            >
              <div className="flex flex-col gap-2">
                <anySeedPhraseBackupForm.Field
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
                </anySeedPhraseBackupForm.Field>
                <anySeedPhraseBackupForm.Field
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
                </anySeedPhraseBackupForm.Field>
                <anySeedPhraseBackupForm.Field
                  name="mnemonicPhrase"
                  validators={{
                    onChange: ({ value }) =>
                      !value ? "Please enter a mnemonic phrase" : undefined,
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
                        placeholder="Mnemonic phrase"
                        className="rounded-none border-primary"
                        required
                      />
                      <MnemonicPhraseFieldInfo field={field} />
                    </div>
                  )}
                </anySeedPhraseBackupForm.Field>
                <anySeedPhraseBackupForm.Subscribe
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
                          <>Backup</>
                        )}
                      </Button>
                      <Button
                        type="reset"
                        variant="outline"
                        onClick={(e) => {
                          // Avoid unexpected resets of form elements (especially <select> elements)
                          e.preventDefault();
                          anySeedPhraseBackupForm.reset();
                        }}
                        className="hover:cursor-pointer rounded-none border-secondary"
                      >
                        Reset
                      </Button>
                    </div>
                  )}
                </anySeedPhraseBackupForm.Subscribe>
              </div>
            </form>
            <div className="flex flex-col gap-2">
              {outputBackupKeystore ? (
                <div className="flex flex-col gap-2">
                  <p>
                    Copy and save the following backup keystore to a secure
                    location.
                  </p>
                  <div className="flex flex-row gap-2">
                    <CopyButton
                      text={JSON.stringify(outputBackupKeystore, null, 2)}
                      variant="outline"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={downloadBackupKeystore}
                      className="hover:cursor-pointer rounded-none border-secondary"
                    >
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearBackupKeystore}
                      className="hover:cursor-pointer rounded-none border-secondary"
                    >
                      Reset
                    </Button>
                  </div>
                  <Textarea
                    value={JSON.stringify(outputBackupKeystore, null, 2)}
                    className="rounded-none border-primary"
                    readOnly
                    rows={10}
                  />
                </div>
              ) : (
                <p>No backup keystore</p>
              )}
            </div>
          </TabsContent>
          <TabsContent value="decrypt" className="flex flex-col gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                anySeedPhraseDecryptForm.handleSubmit();
              }}
            >
              <div className="flex flex-col gap-2">
                <anySeedPhraseDecryptForm.Field
                  name="keystore"
                  validators={{
                    onChange: ({ value }) =>
                      !value ? "Please enter a mnemonic phrase" : undefined,
                  }}
                >
                  {(field) => (
                    <div className="flex flex-col gap-2">
                      <Textarea
                        id={field.name}
                        name={field.name}
                        value={field.state.value || ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Keystore"
                        className="rounded-none border-primary"
                        required
                      />
                      <KeystoreFieldInfo field={field} />
                    </div>
                  )}
                </anySeedPhraseDecryptForm.Field>
                <anySeedPhraseDecryptForm.Field
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
                </anySeedPhraseDecryptForm.Field>
                <anySeedPhraseDecryptForm.Subscribe
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
                          <>Decrypt</>
                        )}
                      </Button>
                      <Button
                        type="reset"
                        variant="outline"
                        onClick={(e) => {
                          // Avoid unexpected resets of form elements (especially <select> elements)
                          e.preventDefault();
                          anySeedPhraseDecryptForm.reset();
                        }}
                        className="hover:cursor-pointer rounded-none border-secondary"
                      >
                        Reset
                      </Button>
                    </div>
                  )}
                </anySeedPhraseDecryptForm.Subscribe>
              </div>
            </form>
            <div className="flex flex-col gap-2">
              {outputDecryptedMnemonicPhrase ? (
                <div className="flex flex-col gap-2">
                  <p>
                    Copy and save the following backup keystore to a secure
                    location.
                  </p>
                  <div className="flex flex-row gap-2">
                    <CopyButton
                      text={outputDecryptedMnemonicPhrase}
                      variant="outline"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearDecryptedMnemonicPhrase}
                      className="hover:cursor-pointer rounded-none border-secondary"
                    >
                      Reset
                    </Button>
                  </div>
                  <Textarea
                    value={outputDecryptedMnemonicPhrase}
                    className="rounded-none border-primary"
                    readOnly
                    rows={10}
                  />
                </div>
              ) : (
                <p>No backup keystore</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
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

function MnemonicPhraseFieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <>
      {!field.state.meta.isTouched ? (
        <em>Please enter a mnemonic phrase</em>
      ) : field.state.meta.isTouched && !field.state.meta.isValid ? (
        <em
          className={`${
            field.state.meta.errors.join(",") ===
            "Please enter a mnemonic phrase"
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


function KeystoreFieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <>
      {!field.state.meta.isTouched ? (
        <em>Please enter a keystore</em>
      ) : field.state.meta.isTouched && !field.state.meta.isValid ? (
        <em
          className={`${
            field.state.meta.errors.join(",") === "Please enter a keystore"
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