import { Loader2, Check, ExternalLink, AlertCircle, X, CircleDashed, Copy } from "lucide-react";
import { useState } from "react";
import { truncateHash } from "@/lib/utils";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import type { Hash } from "viem";

export function TransactionStatus({
  isPending,
  isConfirming,
  isConfirmed,
  txHash,
  blockExplorerUrl,
  error,
  onClearError,
}: {
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  txHash: Hash | undefined;
  blockExplorerUrl: string | undefined;
  error?: string | null;
  onClearError?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent, hash: Hash) {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle className="flex items-center justify-between">
            Error
            {onClearError && (
              <button onClick={onClearError} className="hover:opacity-70">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </AlertTitle>
          <AlertDescription className="text-xs whitespace-pre-wrap break-all">{error}</AlertDescription>
        </Alert>
      )}
      <div className="bg-secondary p-2 text-xs">
        <div className="flex flex-col gap-1">
          {/* Row 1: Signature status */}
          <div className="flex flex-row gap-2 items-center">
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <p>Pending signature</p>
              </>
            ) : isConfirming || isConfirmed || txHash ? (
              <>
                <Check className="w-4 h-4 shrink-0" />
                <p>Signed</p>
              </>
            ) : (
              <>
                <CircleDashed className="w-4 h-4 shrink-0 text-muted-foreground" />
                <p className="text-muted-foreground">Nothing to sign</p>
              </>
            )}
          </div>
          {/* Row 2: Transaction status */}
          <div className="flex flex-row gap-2 items-center">
            {isConfirmed && txHash ? (
              <>
                <Check className="w-4 h-4 shrink-0" />
                <p>Confirmed</p>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:cursor-pointer"
                  href={blockExplorerUrl ? `${blockExplorerUrl}/tx/${txHash}` : undefined}
                >
                  <div className="flex flex-row gap-1 items-center">
                    {truncateHash(txHash)}
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </a>
                <button type="button" onClick={(e) => handleCopy(e, txHash)} className="hover:opacity-70">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </>
            ) : isConfirming && txHash ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <p>Confirming</p>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:cursor-pointer"
                  href={blockExplorerUrl ? `${blockExplorerUrl}/tx/${txHash}` : undefined}
                >
                  <div className="flex flex-row gap-1 items-center">
                    {truncateHash(txHash)}
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </a>
                <button type="button" onClick={(e) => handleCopy(e, txHash)} className="hover:opacity-70 hover:cursor-pointer">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </>
            ) : (
              <>
                <CircleDashed className="w-4 h-4 shrink-0 text-muted-foreground" />
                <p className="text-muted-foreground">No transaction</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
