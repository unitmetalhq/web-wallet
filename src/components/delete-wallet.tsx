import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import type { UmKeystore } from "@/types/wallet";
import { walletsAtom } from "@/atoms/walletsAtom";
import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import { Button } from "@/components/ui/button";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { Keystore, Bytes } from "ox";
import { mnemonicToAccount } from "viem/accounts";


export default function DeleteWallet() {
  const setWallets = useSetAtom(walletsAtom);
  const activeWallet = useAtomValue<UmKeystore | null>(activeWalletAtom);
  const setActiveWallet = useSetAtom(activeWalletAtom);
  const [wrongPassword, setWrongPassword] = useState(false);

  const deleteWalletForm = useForm({
    defaultValues: {
      password: "",
    },
    onSubmit: async ({ value }) => {

      const keystore = activeWallet;

      // Derive the key using your password.
      const key = Keystore.toKey(keystore as Keystore.Keystore, {
        password: value.password,
      });

      try {
        // Decrypt the private key.
        const mnemonicBytes = Keystore.decrypt(
          keystore as Keystore.Keystore,
          key
        );

        const mnemonicPhrase = Bytes.toString(Bytes.fromHex(mnemonicBytes));

        const address = mnemonicToAccount(mnemonicPhrase).address;
        
        // compare the address with the active wallet address
        if (address !== activeWallet?.address) {
          setWrongPassword(true);
          return;
        }
      } catch {
        setWrongPassword(true);
        return;
      }

      // delete the wallet from the list of wallets
      setWallets((prevWallets) => prevWallets.filter((wallet) => wallet.id + wallet.address !== activeWallet?.id + activeWallet?.address));

      // set the active wallet to null
      setActiveWallet(null);

      // Reset the form.
      deleteWalletForm.reset();
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-md text-muted-foreground">
        {activeWallet
          ? `Follow the steps below to delete your current active wallet`
          : "Select a wallet above to delete"}
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          deleteWalletForm.handleSubmit();
        }}
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-row gap-2 items-start">
            <div className="w-6 h-6 bg-primary text-secondary flex items-center justify-center">
              1
            </div>
            <div>Enter your wallet password</div>
          </div>
          <deleteWalletForm.Field
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
          </deleteWalletForm.Field>
          <div className="border-t-2 border-primary my-4 border-dotted" />
          <div className="flex flex-row gap-2 items-start">
            <div className="w-6 h-6 bg-primary text-secondary flex items-center justify-center">
              2
            </div>
            <div>Confirm to proceed with deleting your wallet</div>
          </div>
          <deleteWalletForm.Subscribe
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
                    <>Delete</>
                  )}
                </Button>
                <Button
                  className="hover:cursor-pointer rounded-none"
                  type="reset"
                  variant="outline"
                  disabled={!canSubmit || isSubmitting}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteWalletForm.reset();
                    setWrongPassword(false);
                  }}
                >
                  Reset
                </Button>
              </div>
            )}
          </deleteWalletForm.Subscribe>
        </div>
      </form>
      {wrongPassword && (
        <div className="flex flex-row gap-2 items-center bg-red-500 p-2 text-white">
          <p className="text-sm">Wrong password. Please try again.</p>
        </div>
      )}
    </div>
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
