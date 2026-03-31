"use client";

import { useEffect } from "react";
import { useAtomValue } from "jotai";
import type { UmKeystore } from "@/types/wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm, useStore } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { Loader2, Check, ExternalLink, Search } from "lucide-react";
import { formatEther, type Address, erc20Abi, formatUnits, parseUnits } from "viem";
import {
  useConfig,
  useWaitForTransactionReceipt,
  useGasPrice,
  useEnsAddress,
  useReadContracts,
  useWriteContract
} from "wagmi";
import { normalize } from "viem/ens";
import { useMediaQuery } from "@/hooks/use-media-query";
import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCcw } from "lucide-react";
import { Keystore, Bytes } from "ox";
import { mnemonicToAccount } from "viem/accounts";
import { truncateHash } from "@/lib/utils";

export default function SendErc20TokenForm() {
  // get Wagmi config
  const config = useConfig();

  // check if desktop
  const isDesktop = useMediaQuery("(min-width: 768px)");

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
      tokenAddress: "",
      receivingAddress: "",
      amount: "",
      type: "erc20",
      gasPreset: formatEther(gasPriceData || BigInt(0), "gwei") || "0",
      chain: "",
      password: "",
      message: "",
    },
    onSubmit: async ({ value }) => {
      // console.log(value);

      if (value.type === "erc20") {
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
        sendErc20Transaction({
          account: account,
          address: tokenAddress.endsWith(".eth") ? tokenEnsAddress as Address : tokenAddress as Address,
          abi: erc20Abi,
          functionName: "transfer",
          args: [recipientAddress, parseUnits(value.amount, tokenData?.[3]?.result || 18)],
          chainId: 1,
        });
      }
    },
  });

  // get receiving address reactively from form store
  const tokenAddress = useStore(
    form.store,
    (state) => state.values.tokenAddress || ""
  );

  // get ENS address
  const {
    data: tokenEnsAddress,
    isLoading: isLoadingTokenEnsAddress,
    isError: isErrorTokenEnsAddress,
    refetch: refetchTokenEnsAddress,
  } = useEnsAddress({
    chainId: 1,
    name:
      tokenAddress &&
      tokenAddress.endsWith(".eth") &&
      (tokenAddress.split(".")[0] !== "" || tokenAddress.split(".")[1] !== "")
        ? normalize(tokenAddress)
        : undefined,
    query: {
      enabled: false,
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
    name:
      receivingAddress &&
      receivingAddress.endsWith(".eth") &&
      (receivingAddress.split(".")[0] !== "" ||
        receivingAddress.split(".")[1] !== "")
        ? normalize(receivingAddress)
        : undefined,
    query: {
      enabled: false,
    },
  });

  // check if balance query should be enabled
  const isBalanceQueryEnabled = !!activeWallet?.address;

  const {
    data: tokenData,
    isLoading: isLoadingTokenData,
    refetch: refetchTokenData,
  } = useReadContracts({
    contracts: [
      {
        address: tokenAddress.endsWith(".eth") ? tokenEnsAddress as Address : tokenAddress as Address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [activeWallet?.address as Address],
        chainId: 1,
      },
      {
        address: tokenAddress.endsWith(".eth") ? tokenEnsAddress as Address : tokenAddress as Address,
        abi: erc20Abi,
        functionName: "name",
        chainId: 1,
      },
      {
        address: tokenAddress.endsWith(".eth") ? tokenEnsAddress as Address : tokenAddress as Address,
        abi: erc20Abi,
        functionName: "symbol",
        chainId: 1,
      },
      {
        address: tokenAddress.endsWith(".eth") ? tokenEnsAddress as Address : tokenAddress as Address,
        abi: erc20Abi,
        functionName: "decimals",
        chainId: 1,
      },
    ],
    query: {
      enabled: isBalanceQueryEnabled,
    },
  });

  // hook to send native transaction
  const {
    data: sendErc20TransactionHash,
    isPending: isPendingSendErc20Transaction,
    writeContract: sendErc20Transaction,
    reset: resetSendErc20Transaction,
  } = useWriteContract();

  // hook to wait for transaction receipt
  const {
    isLoading: isConfirmingSendErc20Transaction,
    isSuccess: isConfirmedSendErc20Transaction,
  } = useWaitForTransactionReceipt({
    hash: sendErc20TransactionHash,
    chainId: 1,
  });

  const selectedChainBlockExplorer = config.chains.find(
    (chain) => chain.id === 1
  )?.blockExplorers?.default.url;

  function handleReset() {
    resetSendErc20Transaction();
    form.reset();
  }

  useEffect(() => {
    // reset the transaction state
    resetSendErc20Transaction();

    // reset the form values
    form.reset();

    // refetch the native balance
    refetchTokenData();
  }, [resetSendErc20Transaction, form, refetchTokenData]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <div className="flex flex-col gap-4">
        {/* send erc20 form*/}
        <div>
          <form.Field
            name="tokenAddress"
            validators={{
              onChange: ({ value }) => {
                if (!value) {
                  return "Please enter a token address";
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-2 items-center justify-between">
                  <p className="text-muted-foreground">Token</p>
                </div>
                <div className="flex flex-row gap-2">
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value || ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="rounded-none"
                    type="text"
                    placeholder="Address (0x...) or ENS (.eth)"
                    required
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-none hover:cursor-pointer"
                    type="button"
                    onClick={() => refetchTokenEnsAddress()}
                  >
                    {isLoadingTokenEnsAddress ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search />
                    )}
                  </Button>
                </div>
                <TokenAddressFieldInfo
                  field={field}
                  ensAddress={tokenEnsAddress}
                  isLoadingEnsAddress={isLoadingTokenEnsAddress}
                  isErrorEnsAddress={isErrorTokenEnsAddress}
                />
                {isBalanceQueryEnabled && isLoadingTokenData ? (
                  <Skeleton className="w-12 h-6" />
                ) : (
                  <div className="text-muted-foreground">
                    {tokenData?.[1]?.result ? tokenData[1].result : "-"}{" "}-{" "} 
                    {tokenData?.[2]?.result ? tokenData[2].result : "-"}
                  </div>
                )}
              </div>
            )}
          </form.Field>
        </div>
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
                  const valueInWei = parseUnits(value, tokenData?.[3]?.result || 18);
                  if (
                    tokenData?.[0]?.result &&
                    valueInWei > tokenData?.[0]?.result
                  ) {
                    return "Insufficient balance";
                  }
                } catch {
                  // Handle parseUnits errors for invalid decimal places
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
                          formatUnits(
                            (tokenData?.[0]?.result || BigInt(0)) / BigInt(4),
                            tokenData?.[3]?.result || 18
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
                          formatUnits(
                            (tokenData?.[0]?.result || BigInt(0)) / BigInt(2),
                            tokenData?.[3]?.result || 18
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
                          formatUnits(
                            ((tokenData?.[0]?.result || BigInt(0)) * BigInt(3)) /
                              BigInt(4),
                            tokenData?.[3]?.result || 18
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
                          formatUnits(
                            tokenData?.[0]?.result || BigInt(0),
                            tokenData?.[3]?.result || 18
                          )
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
                      {isBalanceQueryEnabled && isLoadingTokenData ? (
                        <Skeleton className="w-10 h-4" />
                      ) : (
                        formatUnits(tokenData?.[0]?.result || BigInt(0), tokenData?.[3]?.result || 18)
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      {tokenData?.[2]?.result ? tokenData[2].result : "-"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-none hover:cursor-pointer"
                    type="button"
                    onClick={() => refetchTokenData()}
                  >
                    {isBalanceQueryEnabled && isLoadingTokenData ? (
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
            {(field) => (
              <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-2 items-center justify-between">
                  <p className="text-muted-foreground">Recipient</p>
                </div>
                <div className="flex flex-row gap-2">
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value || ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="rounded-none"
                    type="text"
                    placeholder="Address (0x...) or ENS (.eth)"
                    required
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-none hover:cursor-pointer"
                    type="button"
                    onClick={() => refetchEnsAddress()}
                  >
                    {isLoadingEnsAddress ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search />
                    )}
                  </Button>
                </div>
                {/* <div>
                  {isLoadingEnsAddress ? (
                    <Skeleton className="w-10 h-4" />
                  ) : isErrorEnsAddress ? (
                    <div className="text-red-400 text-xs">
                      Failed to resolve ENS
                    </div>
                  ) : ensAddress ? (
                    <em className="text-green-500 text-xs">
                      {ensAddress}  
                    </em>
                  ) : ensAddress === null ? (
                    <div className="text-red-400 text-xs">Invalid ENS</div>
                  ) : null}
                </div> */}
                <ReceivingAddressFieldInfo
                  field={field}
                  ensAddress={ensAddress}
                  isLoadingEnsAddress={isLoadingEnsAddress}
                  isErrorEnsAddress={isErrorEnsAddress}
                />
              </div>
            )}
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
              isPendingSendErc20Transaction,
              isConfirmingSendErc20Transaction,
            ]}
          >
            {([
              canSubmit,
              isPendingSendErc20Transaction,
              isConfirmingSendErc20Transaction,
            ]) => (
              <div className="grid grid-cols-3 gap-2">
                <Button
                  className="hover:cursor-pointer rounded-none col-span-1"
                  variant="outline"
                  type="reset"
                  disabled={
                    !canSubmit ||
                    isPendingSendErc20Transaction ||
                    isConfirmingSendErc20Transaction
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
                    isPendingSendErc20Transaction ||
                    isConfirmingSendErc20Transaction
                  }
                >
                  {isPendingSendErc20Transaction ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </>
                  ) : isConfirmingSendErc20Transaction ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </>
                  ) : isConfirmedSendErc20Transaction ? (
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
                {isPendingSendErc20Transaction ? (
                  <div className="flex flex-row gap-2 items-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <p>Signing transaction...</p>
                  </div>
                ) : isConfirmingSendErc20Transaction ? (
                  <div className="flex flex-row gap-2 items-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <p>Confirming transaction...</p>
                  </div>
                ) : isConfirmedSendErc20Transaction ? (
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
              {sendErc20TransactionHash ? (
                <div className="flex flex-row gap-2 items-center">
                  <p className="text-muted-foreground">&gt;</p>
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 hover:cursor-pointer"
                    href={`${selectedChainBlockExplorer}/tx/${sendErc20TransactionHash}`}
                  >
                    <div className="flex flex-row gap-2 items-center">
                      {truncateHash(sendErc20TransactionHash)}
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

function TokenAddressFieldInfo({
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
        <em>Please enter a token address or ENS</em>
      ) : field.state.meta.isTouched && !field.state.meta.isValid ? (
        <em
          className={`${
            field.state.meta.errors.join(",") ===
            "Please enter a token address or ENS"
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
