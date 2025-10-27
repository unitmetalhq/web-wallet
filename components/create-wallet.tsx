"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { Mnemonic, Keystore, Bytes } from "ox";
import { useSetAtom } from "jotai";
import { walletsAtom } from "@/atoms/walletsAtom";
import type { UmKeystore } from "@/types/wallet";
import { mnemonicToAccount } from "viem/accounts";

export default function CreateWallet() {
  const setWallets = useSetAtom(walletsAtom);

  const form = useForm({
    defaultValues: {
      name: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      // Generate a random mnemonic phrase.
      const mnemonic = Mnemonic.random(Mnemonic.english);

      const address = mnemonicToAccount(mnemonic).address;

      // Convert the mnemonic phrase to bytes.
      const mnemonicBytes = Bytes.fromString(mnemonic);

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
      form.reset();
    },
  });

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div className="flex flex-col gap-2">
          <form.Field
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
          </form.Field>
          <form.Field
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
          </form.Field>
          <form.Subscribe
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
                    form.reset();
                  }}
                  className="hover:cursor-pointer rounded-none border-secondary"
                >
                  Reset
                </Button>
              </div>
            )}
          </form.Subscribe>
        </div>
      </form>
    </>
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
