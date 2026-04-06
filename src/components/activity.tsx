import { useLiveQuery } from "dexie-react-hooks";
import { useAtomValue } from "jotai";
import { db } from "@/lib/db";
import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import type { ActivityRecord, TxType } from "@/types/activity";
import { ExternalLink } from "lucide-react";
import { formatUnits } from "viem";
import { useConfig } from "wagmi";

const TYPE_LABEL: Record<TxType, string> = {
  native: "ETH",
  erc20: "ERC20",
  erc721: "NFT",
  raw: "Raw",
};

function TypeBadge({ type }: { type: TxType }) {
  return (
    <span className="text-[10px] font-mono border border-primary px-1 py-0.5 shrink-0">
      {TYPE_LABEL[type]}
    </span>
  );
}

function formatValue(record: ActivityRecord): string | null {
  if (record.type === "native" && record.nativeValue) {
    return `${formatUnits(BigInt(record.nativeValue), 18)} ETH`;
  }
  if (record.type === "erc20" && record.tokenValue) {
    const decimals = record.tokenDecimals ?? 18;
    const symbol = record.tokenSymbol ?? "";
    return `${formatUnits(BigInt(record.tokenValue), decimals)} ${symbol}`.trim();
  }
  if (record.type === "erc721" && record.nftId) {
    return `Token ID: ${record.nftId}`;
  }
  return null;
}

function formatTimestamp(ts: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ts));
}

export default function Activity() {
  const activeWallet = useAtomValue(activeWalletAtom);
  const config = useConfig();

  const records = useLiveQuery(
    () =>
      activeWallet
        ? db.activity
            .where("from")
            .equalsIgnoreCase(activeWallet.address)
            .reverse()
            .sortBy("timestamp")
        : [],
    [activeWallet?.address]
  );

  function getBlockExplorer(chainId: number): string | undefined {
    return config.chains.find((c) => c.id === chainId)?.blockExplorers?.default
      .url;
  }

  if (!activeWallet) {
    return (
      <p className="text-sm text-muted-foreground">No active wallet selected.</p>
    );
  }

  if (!records) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No activity yet.</p>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {records.map((record) => {
        const explorerUrl = getBlockExplorer(record.chainId);
        const value = formatValue(record);
        const chainName =
          config.chains.find((c) => c.id === record.chainId)?.name ??
          `Chain ${record.chainId}`;

        return (
          <div key={record.id} className="flex flex-col gap-1 py-3">
            <div className="flex flex-row items-center justify-between gap-2">
              <div className="flex flex-row items-center gap-2">
                <TypeBadge type={record.type} />
                <span className="text-xs text-muted-foreground">{chainName}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(record.timestamp)}
              </span>
            </div>

            <div className="flex flex-col gap-0.5 text-xs">
              <div className="flex flex-row gap-2">
                <span className="text-muted-foreground w-6 shrink-0">To</span>
                <span className="font-mono break-all">
                  {record.ensName ? (
                    <>
                      {record.ensName}{" "}
                      <span className="text-muted-foreground">({record.to})</span>
                    </>
                  ) : (
                    record.to
                  )}
                </span>
              </div>

              {value && (
                <div className="flex flex-row gap-2">
                  <span className="text-muted-foreground w-6 shrink-0">Val</span>
                  <span className="font-mono">{value}</span>
                </div>
              )}

              {record.tokenAddress && (
                <div className="flex flex-row gap-2">
                  <span className="text-muted-foreground w-6 shrink-0">Con</span>
                  <span className="font-mono break-all">{record.tokenAddress}</span>
                </div>
              )}

              <div className="flex flex-row gap-2 items-center">
                <span className="text-muted-foreground w-6 shrink-0">Tx</span>
                <span className="font-mono break-all">{record.txHash}</span>
                {explorerUrl && (
                  <a
                    href={`${explorerUrl}/tx/${record.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 hover:opacity-70"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
