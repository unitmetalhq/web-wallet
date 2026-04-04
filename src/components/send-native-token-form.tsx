"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAtomValue } from "jotai";
import type { UmKeystore } from "@/types/wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useForm, useStore } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { Loader2, Check, ExternalLink, Search, QrCode, X, BookUser } from "lucide-react";
import QrScanner from "qr-scanner";
import { parseEther, formatEther, type Address } from "viem";

import {
  useConfig,
  useBalance,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useGasPrice,
  useEnsAddress,
} from "wagmi";
import { normalize } from "viem/ens";
import { useMediaQuery } from "@/hooks/use-media-query";
import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCcw } from "lucide-react";
import { Keystore, Bytes } from "ox";
import { mnemonicToAccount } from "viem/accounts";
import { truncateHash, truncateAddress } from "@/lib/utils";
import { contactsAtom } from "@/atoms/contactsAtom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Parses an address out of QR code data, handling:
 *   - Plain address:        0xABC...  (non-checksum or checksum)
 *   - ERC-3770 short name:  eth:0xABC...
 *   - CAIP-10 / EIP-155:   eip155:1:0xABC...
 *   - EIP-681 URI:          ethereum:0xABC...@1/transfer?...
 *
 * Returns the raw address string (preserving checksum if present) or null.
 */
function parseQrAddress(raw: string): string | null {
  let candidate = raw.trim();

  // Strip any scheme prefix before the address: "eth:", "eip155:1:", "ethereum:", etc.
  // Strategy: if there's a colon, take the last colon-delimited segment.
  if (candidate.includes(":")) {
    const parts = candidate.split(":");
    candidate = parts[parts.length - 1];
  }

  // Strip EIP-681 suffixes: @chainId, /functionName, ?params
  candidate = candidate.split("@")[0].split("/")[0].split("?")[0];

  // Validate: 0x followed by exactly 40 hex characters
  if (/^0x[0-9a-fA-F]{40}$/.test(candidate)) {
    return candidate;
  }

  return null;
}

export default function SendNativeTokenForm() {
  // get Wagmi config
  const config = useConfig();

  // check if desktop
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // contacts
  const contacts = useAtomValue(contactsAtom);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  // QR scanner
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const stopScanner = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setIsScanning(false);
  }, []);

  // Destroy scanner on unmount
  useEffect(() => () => stopScanner(), [stopScanner]);

  // current active wallet
  const activeWallet = useAtomValue<UmKeystore | null>(activeWalletAtom);

  // get gas price
  const {
    data: gasPriceData,
    isLoading: isLoadingGasPrice,
    refetch: refetchGasPrice,
  } = useGasPrice({
    query: {
      enabled: !!activeWallet?.address,
    },
    chainId: 1,
  });

  // send form
  const form = useForm({
    defaultValues: {
      receivingAddress: "",
      amount: "",
      type: "native",
      gasPreset: formatEther(gasPriceData || BigInt(0), "gwei") || "0",
      chain: "",
      password: "",
      message: "",
    },
    onSubmit: async ({ value }) => {
      // console.log(value);

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

        // resolve ENS to address if needed
        let recipientAddress: Address;
        if (value.receivingAddress.endsWith(".eth")) {
          // Get the resolved ENS address from the form state
          // We need to resolve it here if not already resolved
          if (!ensAddress) {
            console.error("ENS address not resolved");
            return;
          }
          recipientAddress = ensAddress as Address;
        } else {
          recipientAddress = value.receivingAddress as Address;
        }

        // execute the send native transaction
        sendNativeTransaction({
          account: account,
          to: recipientAddress,
          value: parseEther(value.amount),
          chainId: 1,
          gasPrice: value.gasPreset
            ? parseEther(value.gasPreset, "gwei")
            : undefined,
        });
      }
    },
  });

  // get receiving address reactively from form store
  const receivingAddress = useStore(
    form.store,
    (state) => state.values.receivingAddress || ""
  );

  // get ENS address
  const {
    data: ensAddress,
    isLoading: isLoadingEnsAddress,
    isError: isErrorEnsAddress,
    refetch: refetchEnsAddress,
  } = useEnsAddress({
    chainId: 1,
    name: receivingAddress && receivingAddress.endsWith(".eth") && (receivingAddress.split(".")[0] !== "" || receivingAddress.split(".")[1] !== "")
      ? normalize(receivingAddress)
      : undefined,
    query: {
      enabled: false,
    },
  });

  // check if balance query should be enabled
  const isBalanceQueryEnabled = !!activeWallet?.address;

  // get native balance
  const {
    data: nativeBalance,
    isLoading: isLoadingNativeBalance,
    refetch: refetchNativeBalance,
  } = useBalance({
    query: {
      enabled: isBalanceQueryEnabled,
    },
    address: (activeWallet?.address as Address) || undefined,
    chainId: 1,
  });

  // hook to send native transaction
  const {
    data: sendNativeTransactionHash,
    isPending: isPendingSendNativeTransaction,
    sendTransaction: sendNativeTransaction,
    reset: resetSendNativeTransaction,
  } = useSendTransaction();

  // hook to wait for transaction receipt
  const {
    isLoading: isConfirmingSendNativeTransaction,
    isSuccess: isConfirmedSendNativeTransaction,
  } = useWaitForTransactionReceipt({
    hash: sendNativeTransactionHash,
    chainId: 1,
  });

  const selectedChainBlockExplorer = config.chains.find(
    (chain) => chain.id === 1
  )?.blockExplorers?.default.url;

  function handleReset() {
    resetSendNativeTransaction();
    form.reset();
  }

  useEffect(() => {
    // reset the transaction state
    resetSendNativeTransaction();

    // reset the form values
    form.reset();

    // refetch the native balance
    refetchNativeBalance();
  }, [resetSendNativeTransaction, form, refetchNativeBalance]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <div className="flex flex-col gap-4">
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
                if (numValue < 0) {
                  return "Amount must be greater than or equal to 0";
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
                    <button
                      type="button"
                      onClick={() =>
                        field.handleChange(
                          formatEther(
                            (nativeBalance?.value || BigInt(0)) / BigInt(4)
                          )
                        )
                      }
                      className="hover:cursor-pointer underline underline-offset-4"
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        field.handleChange(
                          formatEther(
                            (nativeBalance?.value || BigInt(0)) / BigInt(2)
                          )
                        )
                      }
                      className="hover:cursor-pointer underline underline-offset-4"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        field.handleChange(
                          formatEther(
                            ((nativeBalance?.value || BigInt(0)) * BigInt(3)) /
                              BigInt(4)
                          )
                        )
                      }
                      className="hover:cursor-pointer underline underline-offset-4"
                    >
                      75%
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        field.handleChange(
                          formatEther(
                            nativeBalance?.value || BigInt(0)
                          ) as string
                        )
                      }
                      className="hover:cursor-pointer underline underline-offset-4"
                    >
                      Max
                    </button>
                  </div>
                </div>
                <div className="flex flex-row items-center justify-between my-2">
                  {isDesktop ? (
                    <input
                      id={field.name}
                      name={field.name}
                      value={field.state.value || ""}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="bg-transparent text-2xl outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                      className="bg-transparent text-2xl outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                      {isBalanceQueryEnabled && isLoadingNativeBalance ? (
                        <Skeleton className="w-10 h-4" />
                      ) : (
                        formatEther(nativeBalance?.value || BigInt(0))
                      )}
                    </div>
                    <p className="text-muted-foreground">ETH</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-none hover:cursor-pointer"
                    type="button"
                    onClick={() => refetchNativeBalance()}
                  >
                    {isBalanceQueryEnabled && isLoadingNativeBalance ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCcw />
                    )}
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
              onChange: ({ value }) => {
                if (!value) {
                  return "Please enter an address or ENS";
                }
                return undefined;
              },
            }}
          >
            {(field) => {
              function startScanner() {
                if (!videoRef.current) return;
                setIsScanning(true);
                scannerRef.current = new QrScanner(
                  videoRef.current,
                  (result) => {
                    const parsed = parseQrAddress(result.data);
                    if (parsed) {
                      field.handleChange(parsed);
                      stopScanner();
                    }
                  },
                  {
                    returnDetailedScanResult: true,
                    highlightScanRegion: true,
                    highlightCodeOutline: true,
                  }
                );
                scannerRef.current.start().catch(() => stopScanner());
              }

              return (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row gap-2 items-center justify-between">
                    <p className="text-muted-foreground">Recipient</p>
                  </div>
                  <InputGroup className="border-primary">
                    <InputGroupInput
                      id={field.name}
                      name={field.name}
                      value={field.state.value || ""}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="text"
                      placeholder="Address (0x...) or ENS (.eth)"
                      className="text-base"
                      required
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        onClick={() => refetchEnsAddress()}
                        title="Look up ENS"
                        className="hover:cursor-pointer"
                      >
                        {isLoadingEnsAddress ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                      </InputGroupButton>
                      <InputGroupButton
                        type="button"
                        onClick={() => isScanning ? stopScanner() : startScanner()}
                        title={isScanning ? "Stop scanner" : "Scan QR code"}
                        className="hover:cursor-pointer"
                      >
                        {isScanning ? (
                          <X className="w-3.5 h-3.5" />
                        ) : (
                          <QrCode className="w-3.5 h-3.5" />
                        )}
                      </InputGroupButton>
                      <InputGroupButton
                        type="button"
                        onClick={() => setContactPickerOpen(true)}
                        title="Pick from address book"
                        className="hover:cursor-pointer"
                      >
                        <BookUser className="w-3.5 h-3.5" />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <Dialog open={contactPickerOpen} onOpenChange={setContactPickerOpen}>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Address Book</DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-row gap-2 items-center">
                        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                        <input
                          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                          placeholder="Search name or address..."
                          value={contactSearch}
                          onChange={(e) => setContactSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="border-t border-border" />
                      <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                        {contacts
                          .filter((c) => {
                            const q = contactSearch.toLowerCase();
                            return (
                              c.name.toLowerCase().includes(q) ||
                              c.address.toLowerCase().includes(q)
                            );
                          })
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              className="flex flex-row justify-between items-center px-2 py-1.5 hover:bg-muted hover:cursor-pointer text-left"
                              onClick={() => {
                                field.handleChange(c.address);
                                setContactPickerOpen(false);
                                setContactSearch("");
                              }}
                            >
                              <span className="font-medium text-xs">{c.name}</span>
                              <span className="text-xs text-muted-foreground font-mono">{truncateAddress(c.address)}</span>
                            </button>
                          ))}
                        {contacts.filter((c) => {
                          const q = contactSearch.toLowerCase();
                          return c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q);
                        }).length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            {contacts.length === 0 ? "No contacts saved yet." : "No contacts match."}
                          </p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <video
                    ref={videoRef}
                    className={isScanning ? "w-full aspect-square object-cover" : "hidden"}
                  />
                  <ReceivingAddressFieldInfo
                    field={field}
                    ensAddress={ensAddress}
                    isLoadingEnsAddress={isLoadingEnsAddress}
                    isErrorEnsAddress={isErrorEnsAddress}
                  />
                </div>
              );
            }}
          </form.Field>
        </div>
        <div>
          {/* A type-safe field component*/}
          <form.Field name="gasPreset">
            {(field) => (
              <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-2 items-center justify-between">
                  <p className="text-muted-foreground">Gas Preset</p>
                  <div className="flex flex-row gap-4">
                    <button
                      type="button"
                      className="hover:cursor-pointer underline underline-offset-4"
                      onClick={() =>
                        field.handleChange(
                          formatEther(
                            gasPriceData
                              ? (gasPriceData * BigInt(900)) / BigInt(1000)
                              : BigInt(0),
                            "gwei"
                          )
                        )
                      }
                    >
                      Slow
                    </button>
                    <button
                      type="button"
                      className="hover:cursor-pointer underline underline-offset-4"
                      onClick={() =>
                        field.handleChange(
                          formatEther(gasPriceData || BigInt(0), "gwei")
                        )
                      }
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      className="hover:cursor-pointer underline underline-offset-4"
                      onClick={() =>
                        field.handleChange(
                          formatEther(
                            gasPriceData
                              ? (gasPriceData * BigInt(1100)) / BigInt(1000)
                              : BigInt(0),
                            "gwei"
                          )
                        )
                      }
                    >
                      Fast
                    </button>
                  </div>
                </div>
                <div className="flex flex-row items-center justify-between">
                  {isLoadingGasPrice ? (
                    <Skeleton className="w-10 h-4" />
                  ) : (
                    <div className="text-muted-foreground">
                      {field.state.value} gwei
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-none hover:cursor-pointer"
                    type="button"
                    onClick={() => refetchGasPrice()}
                  >
                    {isLoadingGasPrice ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCcw />
                    )}
                  </Button>
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
                  className="rounded-none border-primary text-base"
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

function ReceivingAddressFieldInfo({
  field,
  ensAddress,
  isLoadingEnsAddress,
  isErrorEnsAddress,
}: {
  field: AnyFieldApi;
  ensAddress?: Address | null;
  isLoadingEnsAddress?: boolean;
  isErrorEnsAddress?: boolean;
}) {
  return (
    <>
      {!field.state.meta.isTouched ? (
        <em>Please enter an address or ENS</em>
      ) : field.state.meta.isTouched && !field.state.meta.isValid ? (
        <em
          className={`${
            field.state.meta.errors.join(",") ===
            "Please enter an address or ENS"
              ? ""
              : "text-red-400"
          }`}
        >
          {field.state.meta.errors.join(",")}
        </em>
      ) : isLoadingEnsAddress ? (
        <Skeleton className="w-10 h-4" />
      ) : isErrorEnsAddress ? (
        <div className="text-red-400 text-xs">Failed to resolve ENS</div>
      ) : ensAddress ? (
        <em className="text-green-500 text-xs">{ensAddress}</em>
      ) : ensAddress === null ? (
        <div className="text-red-400 text-xs">Invalid ENS</div>
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
