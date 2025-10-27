"use client";

import { useAtomValue } from "jotai";
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
import { Loader2 } from "lucide-react";
import { parseEther, formatEther, isAddress, Address } from "viem";
import { useConfig, useBalance } from "wagmi";
import { useMediaQuery } from "@/hooks/use-media-query";
import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCcw } from "lucide-react";

export default function SendTokens() {
  // get Wagmi config
  const config = useConfig();

  // check if desktop
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // send form
  const form = useForm({
    defaultValues: {
      receivingAddress: "",
      amount: "",
      type: "",
      gasPreset: "",
      chain: "",
    },
    onSubmit: async ({ value }) => {
      console.log(value);
    },
  });

  const activeWallet = useAtomValue<UmKeystore | null>(activeWalletAtom);

  const {
    data: nativeBalance,
    isLoading: isLoadingNativeBalance,
    refetch: refetchNativeBalance,
  } = useBalance({
    address: activeWallet?.address as Address,
    chainId: form.state.values.chain ? Number(form.state.values.chain) : undefined,
  });

  return (
    <div className="flex flex-col border-2 border-primary gap-2 pb-8">
      <div className="flex flex-row justify-between items-center bg-primary text-secondary p-1">
        <h1 className="text-lg md:text-xl font-bold">Send</h1>
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
                <form.Subscribe
                  selector={(state) => [state.values.chain]}
                >
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
            <form.Field
              name="gasPreset"
              validators={{
                onChange: ({ value }) =>
                  !value
                    ? "Please enter an amount to swap"
                    : parseEther(value) < 0
                    ? "Amount must be greater than 0"
                    : undefined,
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row gap-2 items-center justify-between">
                    <p className="text-muted-foreground">Gas Preset</p>
                  </div>
                  <div className="flex flex-row gap-4">
                    <button
                      className="hover:cursor-pointer underline underline-offset-4"
                      onClick={() => field.handleChange("0.02")}
                    >
                      Slow
                    </button>
                    <button
                      className="hover:cursor-pointer underline underline-offset-4"
                      onClick={() => field.handleChange("0.1")}
                    >
                      Normal
                    </button>
                    <button
                      className="hover:cursor-pointer underline underline-offset-4"
                      onClick={() => field.handleChange("0.5")}
                    >
                      Fast
                    </button>
                  </div>
                </div>
              )}
            </form.Field>
          </div>
          <div className="flex flex-col gap-2">
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  size="lg"
                  className="hover:cursor-pointer text-lg font-bold rounded-none"
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Please confirm in wallet
                    </>
                  ) : (
                    <>Send</>
                  )}
                </Button>
              )}
            </form.Subscribe>
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
