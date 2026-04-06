import { useLiveQuery } from "dexie-react-hooks";
import { useAtomValue } from "jotai";
import { db } from "@/lib/db";
import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import type { ActivityRecord } from "@/types/activity";
import { formatUnits } from "viem";
import { useConfig } from "wagmi";
import { truncateHash } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";


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
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(ts));
}


// ── OutgoingActivity ──────────────────────────────────────────────────────────

export default function OutgoingActivity() {
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
    return config.chains.find((c) => c.id === chainId)?.blockExplorers?.default.url;
  }

  return (
    <div className="flex flex-col border-2 border-primary gap-2 pb-8">
      <div className="flex flex-row justify-between items-center bg-primary text-secondary pl-1">
        <h1 className="text-md font-bold">Outgoing</h1>
      </div>

      <div className="flex flex-col px-4">
        {!activeWallet ? (
          <p className="text-sm text-muted-foreground py-4">No active wallet selected.</p>
        ) : !records ? (
          <p className="text-sm text-muted-foreground py-4">Loading...</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No activity yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {records.map((record) => (
              <OutgoingActivityRow
                key={record.id}
                record={record}
                explorerUrl={getBlockExplorer(record.chainId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── OutgoingActivityRow ───────────────────────────────────────────────────────

function OutgoingActivityRow({
  record,
  explorerUrl,
}: {
  record: ActivityRecord;
  explorerUrl: string | undefined;
}) {
  const value = formatValue(record);

  return (
    <div className="flex flex-col gap-1 py-3">
      {/* top row: tx hash link (left) + date (right) */}
      <div className="flex flex-row items-center justify-between gap-2">
        <div className="flex flex-row items-center gap-2">
          <Badge variant="secondary">Ethereum</Badge>
          {explorerUrl ? (
            <a
              href={`${explorerUrl}/tx/${record.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-muted-foreground hover:text-foreground hover:underline"
            >
              {truncateHash(record.txHash)}
            </a>
          ) : (
            <span className="text-xs font-mono text-muted-foreground">
              {truncateHash(record.txHash)}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {formatTimestamp(record.timestamp)}
        </span>
      </div>

      {/* body rows */}
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
          <div className="flex flex-row gap-2 items-center">
            <span className="text-muted-foreground shrink-0">Amount</span>
            <span className="font-mono">{value}</span>
          </div>
        )}

      </div>
    </div>
  );
}