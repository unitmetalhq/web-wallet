"use client";

import { useEffect, useMemo } from "react";
import { useAtomValue } from "jotai";
import type { UmKeystore } from "@/types/wallet";
import type { TransactionExport } from "@/types/transaction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { Loader2, Check, ExternalLink } from "lucide-react";
import { type Address, type Hex } from "viem";
import {
  useConfig,
  useWaitForTransactionReceipt,
  useSendTransaction,
} from "wagmi";
import { prepareTransactionRequest } from "wagmi/actions";
import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import { Keystore, Bytes } from "ox";
import { mnemonicToAccount } from "viem/accounts";
import { truncateAddress, truncateHash } from "@/lib/utils";

function validateTransactionExport(value: string): TransactionExport | string {
  if (!value) {
    return "Please enter the transaction JSON";
  }
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed.chain !== "number") {
      return "Missing or invalid 'chain' (must be a number)";
    }
    if (!parsed.to || typeof parsed.to !== "string") {
      return "Missing 'to' address";
    }
    if (!parsed.inputs || typeof parsed.inputs !== "object") {
      return "Missing 'inputs' object";
    }
    if (!parsed.inputs.description || typeof parsed.inputs.description !== "string") {
      return "Missing 'inputs.description'";
    }
    if (!parsed.inputs.action || typeof parsed.inputs.action !== "string") {
      return "Missing 'inputs.action'";
    }
    if (!Array.isArray(parsed.inputs.params)) {
      return "Missing 'inputs.params' array";
    }
    for (const param of parsed.inputs.params) {
      if (!param.name || !param.value || !param.type) {
        return "Each param must have 'name', 'value', and 'type'";
      }
    }
    return parsed as TransactionExport;
  } catch {
    return "Invalid JSON format";
  }
}

export default function SendRawTransactionForm({
  selectedChain,
}: {
  selectedChain: number | null;
}) {
  // get Wagmi config
  const config = useConfig();

  // current active wallet
  const activeWallet = useAtomValue<UmKeystore | null>(activeWalletAtom);

  // hook to send transaction
  const {
    data: rawTransactionHash,
    isPending: isPendingRawTransaction,
    sendTransaction,
    reset: resetSendTransaction,
  } = useSendTransaction();

  // send form
  const form = useForm({
    defaultValues: {
      rawTransactionData: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      // check if there is an active wallet
      if (!activeWallet) {
        console.error("No active wallet");
        return;
      }

      // Parse and validate the transaction data
      const parsed = validateTransactionExport(value.rawTransactionData);
      if (typeof parsed === "string") {
        console.error(parsed);
        return;
      }

      // Derive the key using your password.
      const key = Keystore.toKey(activeWallet, {
        password: value.password,
      });

      // Decrypt the mnemonic.
      const mnemonicHex = Keystore.decrypt(activeWallet, key);

      // Convert the mnemonicHex to mnemonicBytes.
      const mnemonicBytes = Bytes.fromHex(mnemonicHex);

      // Convert the mnemonicBytes to a mnemonic phrase
      const mnemonicPhrase = Bytes.toString(mnemonicBytes);

      // Convert the mnemonic phrase to an account
      const account = mnemonicToAccount(mnemonicPhrase);

      // Use chain from the transaction JSON
      const chainId = parsed.chain;

      // Prepare the transaction request (gas estimation, nonce, etc.)
      const prepared = await prepareTransactionRequest(config, {
        account,
        to: parsed.to as Address,
        value: parsed.value ? BigInt(parsed.value) : undefined,
        data: parsed.data as Hex | undefined,
        chainId,
      });

      // Send the prepared transaction
      sendTransaction({
        ...prepared,
        account,
        chainId,
      });
    },
  });

  // Parse the transaction for display
  const parsedTransaction = useMemo(() => {
    const value = form.state.values.rawTransactionData;
    if (!value) return null;
    const result = validateTransactionExport(value);
    if (typeof result === "string") return null;
    return result;
  }, [form.state.values.rawTransactionData]);

  // Get chain name from config
  const getChainName = (chainId: number) => {
    const chain = config.chains.find((c) => c.id === chainId);
    return chain?.name ?? `Chain ${chainId}`;
  };

  // hook to wait for transaction receipt
  const {
    isLoading: isConfirmingRawTransaction,
    isSuccess: isConfirmedRawTransaction,
  } = useWaitForTransactionReceipt({
    hash: rawTransactionHash,
    chainId: parsedTransaction?.chain || selectedChain || undefined,
  });

  const transactionChainBlockExplorer = config.chains.find(
    (chain) => chain.id === (parsedTransaction?.chain || selectedChain)
  )?.blockExplorers?.default.url;

  function handleReset() {
    resetSendTransaction();
    form.reset();
  }

  useEffect(() => {
    // reset the transaction state
    resetSendTransaction();
    // reset the form values
    form.reset();
  }, [selectedChain, form, resetSendTransaction]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <div className="flex flex-col gap-4">
        <div>
          <form.Field
            name="rawTransactionData"
            validators={{
              onChange: ({ value }) => {
                const result = validateTransactionExport(value);
                if (typeof result === "string") {
                  return result;
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-2 items-center justify-between">
                  <p className="text-muted-foreground">Transaction JSON</p>
                </div>
                <div className="flex flex-row gap-2">
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value || ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="rounded-none"
                    placeholder='{"chain": 1, "to": "0x...", "value": "0", "data": "0x...", "inputs": {"description": "...", "action": "...", "params": [...]}}'
                    required
                  />
                </div>
                <RawTransactionDataFieldInfo field={field} />
              </div>
            )}
          </form.Field>
        </div>
        {parsedTransaction && (
          <div className="border border-primary p-4">
            <div className="flex flex-col gap-3">
              <div className="border-b border-primary pb-2">
                <p className="font-medium">Transaction Details</p>
              </div>
              <div className="border-b border-primary pb-3">
                <p className="text-md">{parsedTransaction.inputs.description}</p>
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex flex-row gap-2">
                  <span className="text-muted-foreground">Action:</span>
                  <span className="font-mono">{parsedTransaction.inputs.action}</span>
                </div>
                <div className="flex flex-row gap-2">
                  <span className="text-muted-foreground">Chain:</span>
                  <span>{getChainName(parsedTransaction.chain)}</span>
                </div>
                <div className="flex flex-row gap-2">
                  <span className="text-muted-foreground">Contract:</span>
                  <span className="font-mono text-md">{truncateAddress(parsedTransaction.to)}</span>
                </div>
                {parsedTransaction.value && parsedTransaction.value !== "0" && (
                  <div className="flex flex-row gap-2">
                    <span className="text-muted-foreground">Value:</span>
                    <span className="font-mono text-md">{parsedTransaction.value} wei</span>
                  </div>
                )}
              </div>
              {parsedTransaction.inputs.params.length > 0 && (
                <div className="flex flex-col gap-1 text-sm border-t border-primary pt-3">
                  <p className="text-muted-foreground">Parameters:</p>
                  <div className="flex flex-col gap-1 pl-2">
                    {parsedTransaction.inputs.params.map((param, index) => (
                      <div key={index} className="flex flex-row gap-2">
                        <span className="text-muted-foreground text-md">{param.name}:</span>
                        <span className="font-mono text-wrap text-md">{param.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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
              isPendingRawTransaction,
              isConfirmingRawTransaction,
            ]}
          >
            {([
              canSubmit,
              isPendingRawTransaction,
              isConfirmingRawTransaction,
            ]) => (
              <div className="grid grid-cols-3 gap-2">
                <Button
                  className="hover:cursor-pointer rounded-none col-span-1"
                  variant="outline"
                  type="reset"
                  disabled={
                    !canSubmit ||
                    isPendingRawTransaction ||
                    isConfirmingRawTransaction
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
                    isPendingRawTransaction ||
                    isConfirmingRawTransaction
                  }
                >
                  {isPendingRawTransaction ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </>
                  ) : isConfirmingRawTransaction ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </>
                  ) : isConfirmedRawTransaction ? (
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
                {isPendingRawTransaction ? (
                  <div className="flex flex-row gap-2 items-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <p>Signing transaction...</p>
                  </div>
                ) : isConfirmingRawTransaction ? (
                  <div className="flex flex-row gap-2 items-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <p>Confirming transaction...</p>
                  </div>
                ) : isConfirmedRawTransaction ? (
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
              {rawTransactionHash ? (
                <div className="flex flex-row gap-2 items-center">
                  <p className="text-muted-foreground">&gt;</p>
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 hover:cursor-pointer"
                    href={`${transactionChainBlockExplorer}/tx/${rawTransactionHash}`}
                  >
                    <div className="flex flex-row gap-2 items-center">
                      {truncateHash(rawTransactionHash)}
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
  );
}

function RawTransactionDataFieldInfo({
  field,
}: {
  field: AnyFieldApi;
}) {
  return (
    <>
      {!field.state.meta.isTouched ? (
        <em>Please enter the transaction JSON</em>
      ) : field.state.meta.isTouched && !field.state.meta.isValid ? (
        <em
          className={`${
            field.state.meta.errors.join(",") ===
            "Please enter the transaction JSON"
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
