"use client";


import { useAtomValue } from "jotai";
import { useStore } from "@tanstack/react-form";
import type { UmKeystore } from "@/types/wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Loader2, Check, ExternalLink } from "lucide-react";
import { parseEther, formatEther, isAddress, Address } from "viem";
import {
  useConfig,
  useBalance,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useMediaQuery } from "@/hooks/use-media-query";
import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCcw } from "lucide-react";
import { Keystore, Bytes } from "ox";
import { mnemonicToAccount } from "viem/accounts";
import { truncateHash } from "@/lib/utils";
import CopyButton from "@/components/copy-button";

export default function SendTokens() {
  // get Wagmi config
  const config = useConfig();

  // check if desktop
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // current active wallet
  const activeWallet = useAtomValue<UmKeystore | null>(activeWalletAtom);

  // send form
  const form = useForm({
    defaultValues: {
      receivingAddress: "",
      amount: "",
      type: "native",
      gasPreset: "normal",
      chain: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      console.log(value);

      if (value.type === "native") {
        // check if there is an active wallet
        if (!activeWallet) {
          console.error("No active wallet");
          return;
        }

        // duplicate the active wallet
        const currentActiveWallet = activeWallet;

        // Derive the key using your password.
        const key = Keystore.toKey(currentActiveWallet, {
          password: value.password,
        });

        // Decrypt the mnemonic.
        const mnemonicHex = Keystore.decrypt(currentActiveWallet, key);

        // Convert the mnemonicHex to mnemonicBytes.
        const mnemonicBytes = Bytes.fromHex(mnemonicHex);

        // Convert the mnemonicBytes to a mnemonic phrase
        const mnemonicPhrase = Bytes.toString(mnemonicBytes);

        // Convert the mnemonic phrase to an account
        const account = mnemonicToAccount(mnemonicPhrase);

        sendNativeTransaction({
          account: account,
          to: value.receivingAddress as Address,
          value: parseEther(value.amount),
          chainId: Number(form.state.values.chain),
        });
      }
    },
  });

  const {
    data: nativeBalance,
    isLoading: isLoadingNativeBalance,
    refetch: refetchNativeBalance,
  } = useBalance({
    address: activeWallet?.address as Address,
    chainId: Number(useStore(form.store, (state) => state.values.chain)),
  });

  const {
    data: sendNativeTransactionHash,
    isPending: isPendingSendNativeTransaction,
    sendTransaction: sendNativeTransaction,
    reset: resetSendNativeTransaction,
  } = useSendTransaction();

  const {
    isLoading: isConfirmingSendNativeTransaction,
    isSuccess: isConfirmedSendNativeTransaction,
  } = useWaitForTransactionReceipt({
    hash: sendNativeTransactionHash,
    chainId: Number(useStore(form.store, (state) => state.values.chain)),
  });

  const selectedChainBlockExplorer = config.chains.find(
    (chain) => chain.id.toString() === form.state.values.chain
  )?.blockExplorers?.default.url;

  function handleReset() {
    resetSendNativeTransaction();
    form.reset();
  }

  return (
    <div className="flex flex-col border-2 border-primary gap-2 pb-8">
      <div className="flex flex-row justify-between items-center bg-primary text-secondary p-1">
        <h1 className="text-lg font-bold">Send</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div className="flex flex-col gap-4 px-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="select-chain">Chain</Label>
            <Select
              value={form.state.values.chain}
              onValueChange={(value) => {
                form.setFieldValue("chain", value);
              }}
            >
              <SelectTrigger className="w-full border-primary border rounded-none">
                <SelectValue placeholder="Select a chain" />
              </SelectTrigger>
              <SelectContent className="border-primary border rounded-none">
                {config.chains.map((chain) => (
                  <SelectItem key={chain.id} value={chain.id.toString()}>
                    {chain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Tabs defaultValue="native" className="w-full">
            <TabsList className="border-primary border rounded-none">
              <TabsTrigger className="rounded-none" value="native">
                <form.Subscribe selector={(state) => [state.values.chain]}>
                  {([chainValue]) => {
                    const chain = config.chains.find(
                      (c) => c.id.toString() === chainValue
                    );
                    return chain?.nativeCurrency.symbol || "Native";
                  }}
                </form.Subscribe>
              </TabsTrigger>
              <TabsTrigger className="rounded-none" value="erc20">
                ERC20
              </TabsTrigger>
            </TabsList>
            <TabsContent value="native" className="flex flex-col gap-4">
              {/* send native form*/}
              <div>
                <form.Field
                  name="amount"
                  validators={{
                    onChange: ({ value }) => {
                      // Check if empty
                      if (!value) {
                        return "Please enter an amount to send";
                      }

                      // Convert to number and check if it's valid
                      const numValue = parseFloat(value);
                      if (isNaN(numValue)) {
                        return "Please enter a valid number";
                      }

                      // Check if negative
                      if (numValue <= 0) {
                        return "Amount must be greater than 0";
                      }

                      // Try to parse ether and check balance
                      try {
                        const valueInWei = parseEther(value);
                        if (
                          nativeBalance?.value &&
                          valueInWei > nativeBalance.value
                        ) {
                          return "Insufficient balance";
                        }
                      } catch {
                        // Handle parseEther errors for invalid decimal places
                        return "Invalid amount format";
                      }

                      return undefined;
                    },
                  }}
                >
                  {(field) => (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-row gap-2 items-center justify-between">
                        <p className="text-muted-foreground">Sending</p>
                        <div className="flex flex-row gap-4">
                          <button className="hover:cursor-pointer underline underline-offset-4">
                            25%
                          </button>
                          <button className="hover:cursor-pointer underline underline-offset-4">
                            50%
                          </button>
                          <button className="hover:cursor-pointer underline underline-offset-4">
                            75%
                          </button>
                          <button className="hover:cursor-pointer underline underline-offset-4">
                            Max
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-row items-center justify-between my-4">
                        {isDesktop ? (
                          <input
                            id={field.name}
                            name={field.name}
                            value={field.state.value || ""}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className="bg-transparent text-4xl outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            type="number"
                            placeholder="0"
                            required
                          />
                        ) : (
                          <input
                            id={field.name}
                            name={field.name}
                            value={field.state.value || ""}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className="bg-transparent text-4xl outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            type="number"
                            inputMode="decimal"
                            pattern="[0-9]*"
                            placeholder="0"
                            required
                          />
                        )}
                      </div>
                      <div className="flex flex-row items-center justify-between">
                        <div className="flex flex-row gap-2">
                          <div className="text-muted-foreground">
                            {isLoadingNativeBalance ? (
                              <Skeleton className="w-10 h-4" />
                            ) : (
                              formatEther(nativeBalance?.value || BigInt(0))
                            )}
                          </div>
                          <form.Subscribe
                            selector={(state) => [state.values.chain]}
                          >
                            {([chainValue]) => {
                              const chain = config.chains.find(
                                (c) => c.id.toString() === chainValue
                              );
                              return (
                                <p className="text-muted-foreground">
                                  {chain?.nativeCurrency.symbol || "Native"}
                                </p>
                              );
                            }}
                          </form.Subscribe>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-none hover:cursor-pointer"
                          onClick={() => refetchNativeBalance()}
                        >
                          <RefreshCcw />
                        </Button>
                      </div>
                      <AmountFieldInfo field={field} />
                    </div>
                  )}
                </form.Field>
              </div>
              <div>
                <form.Field
                  name="receivingAddress"
                  validators={{
                    onChange: ({ value }) =>
                      !value
                        ? "Please enter a recipient address"
                        : !isAddress(value)
                        ? "Invalid recipient address"
                        : undefined,
                  }}
                >
                  {(field) => (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-row gap-2 items-center justify-between">
                        <p className="text-muted-foreground">Recipient</p>
                      </div>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value || ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="rounded-none"
                        type="text"
                        placeholder="Address (0x...)"
                        required
                      />
                      <ReceivingAddressFieldInfo field={field} />
                    </div>
                  )}
                </form.Field>
              </div>
            </TabsContent>
            <TabsContent value="erc20" className="flex flex-col gap-4">
              <div>WIP</div>
            </TabsContent>
          </Tabs>
          <div>
            {/* A type-safe field component*/}
            <form.Field name="gasPreset">
              {(field) => (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row gap-2 items-center justify-between">
                    <p className="text-muted-foreground">Gas Preset</p>
                  </div>
                  <div className="flex flex-row gap-4">
                    <button
                      className="hover:cursor-pointer underline underline-offset-4"
                      onClick={() => field.handleChange("slow")}
                    >
                      Slow
                    </button>
                    <button
                      className="hover:cursor-pointer underline underline-offset-4"
                      onClick={() => field.handleChange("normal")}
                    >
                      Normal
                    </button>
                    <button
                      className="hover:cursor-pointer underline underline-offset-4"
                      onClick={() => field.handleChange("fast")}
                    >
                      Fast
                    </button>
                  </div>
                </div>
              )}
            </form.Field>
          </div>
          <div className="border-t-2 border-primary pt-4 border-dotted">
            <form.Field
              name="password"
              validators={{
                onChange: ({ value }) =>
                  !value ? "Please enter your wallet password" : undefined,
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value || ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="rounded-none border-primary"
                    type="password"
                    placeholder="Password"
                    required
                  />
                  <PasswordFieldInfo field={field} />
                </div>
              )}
            </form.Field>
          </div>
          <div className="flex flex-col gap-2">
            <form.Subscribe
              selector={(state) => [
                state.canSubmit,
                isPendingSendNativeTransaction,
                isConfirmingSendNativeTransaction,
              ]}
            >
              {([
                canSubmit,
                isPendingSendNativeTransaction,
                isConfirmingSendNativeTransaction,
              ]) => (
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    className="hover:cursor-pointer rounded-none col-span-1"
                    variant="outline"
                    type="reset"
                    disabled={
                      !canSubmit ||
                      isPendingSendNativeTransaction ||
                      isConfirmingSendNativeTransaction
                    }
                    onClick={handleReset}
                  >
                    Reset
                  </Button>
                  <Button
                    className="hover:cursor-pointer rounded-none col-span-2"
                    type="submit"
                    disabled={
                      !canSubmit ||
                      isPendingSendNativeTransaction ||
                      isConfirmingSendNativeTransaction
                    }
                  >
                    {isPendingSendNativeTransaction ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </>
                    ) : isConfirmingSendNativeTransaction ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </>
                    ) : isConfirmedSendNativeTransaction ? (
                      <>
                        <Check className="w-4 h-4" />
                      </>
                    ) : (
                      <>Send</>
                    )}
                  </Button>
                </div>
              )}
            </form.Subscribe>
            <div className="border-t-2 border-primary pt-4 mt-4">
              <div className="flex flex-col gap-1">
                <div className="flex flex-row gap-2 items-center">
                  {isPendingSendNativeTransaction ? (
                    <div className="flex flex-row gap-2 items-center">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <p>Signing transaction...</p>
                    </div>
                  ) : isConfirmingSendNativeTransaction ? (
                    <div className="flex flex-row gap-2 items-center">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <p>Confirming transaction...</p>
                    </div>
                  ) : isConfirmedSendNativeTransaction ? (
                    <div className="flex flex-row gap-2 items-center">
                      <Check className="w-4 h-4" />
                      <p>Transaction confirmed</p>
                    </div>
                  ) : (
                    <div className="flex flex-row gap-2 items-center">
                      <p className="text-muted-foreground">&gt;</p>
                      <p>No pending transaction</p>
                    </div>
                  )}
                </div>
                {sendNativeTransactionHash ? (
                  <div className="flex flex-row gap-2 items-center">
                    <p className="text-muted-foreground">&gt;</p>
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4 hover:cursor-pointer"
                      href={`${selectedChainBlockExplorer}/tx/${sendNativeTransactionHash}`}
                    >
                      <div className="flex flex-row gap-2 items-center">
                        {truncateHash(sendNativeTransactionHash)}
                        <ExternalLink className="w-4 h-4" />
                      </div>
                    </a>
                  </div>
                ) : (
                  <div className="flex flex-row gap-2 items-center">
                    <p className="text-muted-foreground">&gt;</p>
                    <p>No transaction hash</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function AmountFieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <>
      {!field.state.meta.isTouched ? (
        <em>Please enter an amount to send</em>
      ) : field.state.meta.isTouched && !field.state.meta.isValid ? (
        <em
          className={`${
            field.state.meta.errors.join(",") ===
            "Please enter an amount to send"
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

function ReceivingAddressFieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <>
      {!field.state.meta.isTouched ? (
        <em>Please enter a recipient address</em>
      ) : field.state.meta.isTouched && !field.state.meta.isValid ? (
        <em
          className={`${
            field.state.meta.errors.join(",") ===
            "Please enter a recipient address"
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
