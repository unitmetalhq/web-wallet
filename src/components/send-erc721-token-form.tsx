import { useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import type { UmKeystore } from "@/types/wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm, useStore } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { Loader2, Check, Search } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import QrScannerButton from "@/components/qr-scanner-button";
import AddressBookPickerButton from "@/components/address-book-picker-button";
import { NftPickerDialog } from "@/components/nft-picker-dialog";
import { type Address, erc721Abi } from "viem";
import {
  useConfig,
  useWaitForTransactionReceipt,
  useGasPrice,
  useEnsAddress,
  useReadContracts,
  useWriteContract
} from "wagmi";
import { formatEther } from "viem";
import { normalize } from "viem/ens";
import { useMediaQuery } from "@/hooks/use-media-query";
import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCcw } from "lucide-react";
import { decryptWalletToAccount } from "@/lib/um-wallet";
import { recordActivity } from "@/lib/activity";
import type { ActivityRecord } from "@/types/activity";
import { TransactionStatus } from "@/components/transaction-status";
import { InformationDialog } from "@/components/information-dialog";


export default function SendErc721TokenForm() {
  // get Wagmi config
  const config = useConfig();

  // check if desktop
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // current active wallet
  const activeWallet = useAtomValue<UmKeystore | null>(activeWalletAtom);

  // capture submit-time data to record on confirmation
  const pendingActivityRef = useRef<Omit<ActivityRecord, "id" | "timestamp" | "txHash"> | null>(null);

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
      tokenId: "",
      receivingAddress: "",
      type: "erc721",
      gasPreset: formatEther(gasPriceData || BigInt(0), "gwei") || "0",
      chain: "",
      password: "",
      message: "",
    },
    onSubmit: async ({ value }) => {
      if (value.type === "erc721") {
        // check if there is an active wallet
        if (!activeWallet) {
          console.error("No active wallet");
          return;
        }

        const account = decryptWalletToAccount(activeWallet, value.password);

        // resolve ENS to address if needed
        let recipientAddress: Address;
        if (value.receivingAddress.endsWith(".eth")) {
          if (!ensAddress) {
            console.error("ENS address not resolved");
            return;
          }
          recipientAddress = ensAddress as Address;
        } else {
          recipientAddress = value.receivingAddress as Address;
        }

        const contractAddress = tokenAddress.endsWith(".eth")
          ? (tokenEnsAddress as Address)
          : (tokenAddress as Address);

        // capture activity data before sending
        pendingActivityRef.current = {
          type: "erc721",
          from: activeWallet.address,
          to: recipientAddress,
          chainId: 1,
          tokenAddress: contractAddress,
          nftId: value.tokenId,
          ensName: value.receivingAddress.endsWith(".eth") ? value.receivingAddress : undefined,
        };

        // execute the safeTransferFrom transaction
        sendErc721Transaction({
          account: account,
          address: contractAddress,
          abi: erc721Abi,
          functionName: "safeTransferFrom",
          args: [account.address, recipientAddress, BigInt(value.tokenId)],
          chainId: 1,
        });
      }
    },
  });

  // get token address reactively from form store
  const tokenAddress = useStore(
    form.store,
    (state) => state.values.tokenAddress || ""
  );

  // get ENS address for token contract
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

  // get tokenId reactively from form store
  const tokenId = useStore(
    form.store,
    (state) => state.values.tokenId || ""
  );

  // get receiving address reactively from form store
  const receivingAddress = useStore(
    form.store,
    (state) => state.values.receivingAddress || ""
  );

  // get ENS address for recipient
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

  const resolvedTokenAddress = tokenAddress.endsWith(".eth")
    ? (tokenEnsAddress as Address)
    : (tokenAddress as Address);

  const isBalanceQueryEnabled = !!activeWallet?.address;
  const isTokenIdQueryEnabled =
    isBalanceQueryEnabled && !!tokenId && !isNaN(Number(tokenId));

  const {
    data: tokenData,
    isLoading: isLoadingTokenData,
    refetch: refetchTokenData,
  } = useReadContracts({
    contracts: [
      {
        address: resolvedTokenAddress,
        abi: erc721Abi,
        functionName: "name",
        chainId: 1,
      },
      {
        address: resolvedTokenAddress,
        abi: erc721Abi,
        functionName: "symbol",
        chainId: 1,
      },
      {
        address: resolvedTokenAddress,
        abi: erc721Abi,
        functionName: "ownerOf",
        args: isTokenIdQueryEnabled ? [BigInt(tokenId)] : [BigInt(0)],
        chainId: 1,
      },
    ],
    query: {
      enabled: isBalanceQueryEnabled,
    },
  });

  // hook to send ERC721 transaction
  const {
    data: sendErc721TransactionHash,
    isPending: isPendingSendErc721Transaction,
    writeContract: sendErc721Transaction,
    reset: resetSendErc721Transaction,
  } = useWriteContract();

  // hook to wait for transaction receipt
  const {
    isLoading: isConfirmingSendErc721Transaction,
    isSuccess: isConfirmedSendErc721Transaction,
  } = useWaitForTransactionReceipt({
    hash: sendErc721TransactionHash,
    chainId: 1,
  });

  const selectedChainBlockExplorer = config.chains.find(
    (chain) => chain.id === 1
  )?.blockExplorers?.default.url;

  function handleReset() {
    resetSendErc721Transaction();
    form.reset();
  }

  useEffect(() => {
    if (isConfirmedSendErc721Transaction && sendErc721TransactionHash && pendingActivityRef.current) {
      recordActivity({ ...pendingActivityRef.current, txHash: sendErc721TransactionHash });
      pendingActivityRef.current = null;
    }
  }, [isConfirmedSendErc721Transaction, sendErc721TransactionHash]);

  useEffect(() => {
    resetSendErc721Transaction();
    form.reset();
    refetchTokenData();
  }, [resetSendErc721Transaction, form, refetchTokenData]);

  // check if the active wallet owns the tokenId
  const ownerOf = tokenData?.[2]?.result as Address | undefined;
  const isOwner =
    ownerOf &&
    activeWallet?.address &&
    ownerOf.toLowerCase() === activeWallet.address.toLowerCase();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <div className="flex flex-col gap-4">
        {/* token contract address */}
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
                  <p className="text-muted-foreground">NFT Contract</p>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-2 items-start">
                  <NftPickerDialog
                    contractValue={field.state.value}
                    tokenIdValue={tokenId}
                    onSelect={(addr, id) => {
                      form.setFieldValue("tokenAddress", addr);
                      form.setFieldValue("tokenId", id);
                    }}
                  />
                  <InputGroup className="border-primary">
                    <InputGroupInput
                      id={field.name}
                      name={field.name}
                      value={field.state.value || ""}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="text"
                      placeholder="Address (0x...) or ENS (.eth)"
                      className="text-base rounded-none"
                      required
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        onClick={() => refetchTokenEnsAddress()}
                        title="Look up ENS"
                        className="hover:cursor-pointer"
                      >
                        {isLoadingTokenEnsAddress ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                      </InputGroupButton>
                      <QrScannerButton onScan={(address) => field.handleChange(address)} />
                    </InputGroupAddon>
                  </InputGroup>
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
                    {tokenData?.[0]?.result ? tokenData[0].result : "-"}{" "}-{" "}
                    {tokenData?.[1]?.result ? tokenData[1].result : "-"}
                  </div>
                )}
              </div>
            )}
          </form.Field>
        </div>

        {/* token ID */}
        <div>
          <form.Field
            name="tokenId"
            validators={{
              onChange: ({ value }) => {
                if (!value) {
                  return "Please enter a token ID";
                }
                if (isNaN(Number(value)) || Number(value) < 0) {
                  return "Please enter a valid token ID";
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-2 items-center justify-between">
                  <p className="text-muted-foreground">Token ID</p>
                </div>
                <div className="flex flex-row items-center justify-between">
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
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0"
                      required
                    />
                  )}
                </div>
                <div className="flex flex-row items-center justify-between">
                  <div className="text-muted-foreground text-xs">
                    {isTokenIdQueryEnabled && isLoadingTokenData ? (
                      <Skeleton className="w-24 h-4" />
                    ) : isTokenIdQueryEnabled && ownerOf ? (
                      isOwner ? (
                        <span className="text-green-500">Owned by you</span>
                      ) : (
                        <span className="text-red-400">
                          Owned by <span className="font-mono">{ownerOf}</span>
                        </span>
                      )
                    ) : <span className="text-muted-foreground">--</span>}
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
                <TokenIdFieldInfo field={field} />
              </div>
            )}
          </form.Field>
        </div>

        {/* recipient address */}
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
                <div className="flex flex-row gap-2 items-center">
                  <p className="text-muted-foreground">Recipient</p>
                  <InformationDialog
                    title="Recipient"
                    content="Enter the address of the recipient. You can also enter an ENS name to resolve it to an address. Make sure to click the search icon to resolve the ENS name after input."
                  />
                </div>
                <InputGroup className="border-primary">
                  <InputGroupInput
                    id={field.name}
                    name={field.name}
                    value={field.state.value || ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    type="text"
                    placeholder="Address (0x...) or ENS (.eth)"
                    className="text-base rounded-none"
                    required
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
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
                    <QrScannerButton onScan={(address) => field.handleChange(address)} />
                    <AddressBookPickerButton onSelect={(address) => field.handleChange(address)} />
                  </InputGroupAddon>
                </InputGroup>
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

        {/* gas preset */}
        <div>
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

        {/* password */}
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

        {/* submit + status */}
        <div className="flex flex-col gap-2">
          <form.Subscribe
            selector={(state) => [
              state.canSubmit,
              isPendingSendErc721Transaction,
              isConfirmingSendErc721Transaction,
            ]}
          >
            {([
              canSubmit,
              isPendingSendErc721Transaction,
              isConfirmingSendErc721Transaction,
            ]) => (
              <div className="grid grid-cols-3 gap-2">
                <Button
                  className="hover:cursor-pointer rounded-none col-span-1"
                  variant="outline"
                  type="reset"
                  disabled={
                    !canSubmit ||
                    isPendingSendErc721Transaction ||
                    isConfirmingSendErc721Transaction
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
                    isPendingSendErc721Transaction ||
                    isConfirmingSendErc721Transaction
                  }
                >
                  {isPendingSendErc721Transaction ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isConfirmingSendErc721Transaction ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isConfirmedSendErc721Transaction ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <>Send</>
                  )}
                </Button>
              </div>
            )}
          </form.Subscribe>
          <div className="border-t-2 border-primary pt-4 mt-4">
            <TransactionStatus
              isPending={isPendingSendErc721Transaction}
              isConfirming={isConfirmingSendErc721Transaction}
              isConfirmed={isConfirmedSendErc721Transaction}
              txHash={sendErc721TransactionHash}
              blockExplorerUrl={selectedChainBlockExplorer}
            />
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

function TokenIdFieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <>
      {!field.state.meta.isTouched ? (
        <em>Please enter the NFT token ID</em>
      ) : field.state.meta.isTouched && !field.state.meta.isValid ? (
        <em
          className={`${
            field.state.meta.errors.join(",") === "Please enter a token ID"
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
