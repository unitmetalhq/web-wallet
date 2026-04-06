import { useAtom } from "jotai";
import { walletsAtom } from "@/atoms/walletsAtom";
import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";
import type { UmKeystore } from "@/types/wallet";

const CURRENT_UM_VERSION = "0.0.1";
const CURRENT_META_TYPE = "password-keystore-seedphrase";

function needsMigration(wallet: UmKeystore): boolean {
  return (
    wallet.meta.umVersion !== CURRENT_UM_VERSION ||
    wallet.meta.type !== CURRENT_META_TYPE
  );
}

function migrateWallet(wallet: UmKeystore): UmKeystore {
  return {
    ...wallet,
    meta: {
      ...wallet.meta,
      type: CURRENT_META_TYPE,
      umVersion: CURRENT_UM_VERSION,
    },
  };
}

export default function MigrationWalletStorage() {
  const [wallets, setWallets] = useAtom(walletsAtom);

  const hasMismatch = wallets.some(needsMigration);

  if (!hasMismatch) return null;

  function handleMigrate() {
    setWallets((prev) => prev.map((w) => (needsMigration(w) ? migrateWallet(w) : w)));
  }

  const staleCount = wallets.filter(needsMigration).length;

  return (
    <div className="flex flex-col gap-2 border-2 border-yellow-500 bg-yellow-500/10 p-3">
      <div className="flex flex-row gap-2 items-center text-yellow-600 dark:text-yellow-400">
        <TriangleAlert className="w-4 h-4 shrink-0" />
        <p className="text-xs font-medium">
          {staleCount} wallet{staleCount > 1 ? "s are" : " is"} on an older storage
          format (missing <code>umVersion</code>).
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Click below to migrate to the current format ({CURRENT_UM_VERSION}). No keys are changed — only metadata is updated.
      </p>
      <Button
        type="button"
        className="rounded-none hover:cursor-pointer w-fit border-yellow-500 text-yellow-600 dark:text-yellow-400"
        variant="outline"
        onClick={handleMigrate}
      >
        Migrate {staleCount} wallet{staleCount > 1 ? "s" : ""}
      </Button>
    </div>
  );
}
