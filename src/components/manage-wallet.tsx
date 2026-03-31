import { useAtomValue, useSetAtom } from "jotai";
import CreateWallet from "@/components/create-wallet";
import type { UmKeystore } from "@/types/wallet";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { truncateAddress } from "@/lib/utils";
import { walletsAtom } from "@/atoms/walletsAtom";
import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import CopyButton from "@/components/copy-button";
import { Cuer } from "cuer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ExportWallet from "@/components/export-wallet";
import DeleteWallet from "@/components/delete-wallet";
import ImportWallet from "@/components/import-wallet";


export default function ManageWallet() {
  const wallets = useAtomValue<Array<UmKeystore>>(walletsAtom);
  const activeWallet = useAtomValue<UmKeystore | null>(activeWalletAtom);
  const setActiveWallet = useSetAtom(activeWalletAtom);

  const walletItems = wallets.map((wallet) => ({
    label: wallet.name,
    value: wallet.id,
    address: wallet.address,
  }));

  function handleSelectWallet(value: string | null) {
    if (value == null) {
      setActiveWallet(null);
      return;
    }
    setActiveWallet(
      wallets.find((wallet) => wallet.id === value) ?? null
    );
  }

  return (
    <div className="flex flex-col border-2 border-primary gap-2 pb-8">
      <div className="flex flex-row justify-between items-center bg-primary text-secondary pl-1">
        <h1 className="text-md font-bold">Wallets</h1>
      </div>
      {wallets && wallets.length > 0 ? (
        <div className="flex flex-col gap-4 px-4 py-2">
          <div className="flex flex-col gap-2">
            <Select items={walletItems} onValueChange={handleSelectWallet}>
              <SelectTrigger className="w-full border-primary border rounded-none">
                <SelectValue placeholder="Select a wallet" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {walletItems.map((wallet) => (
                    <SelectItem key={wallet.value} value={wallet.value}>
                      <div className="flex flex-row gap-2">
                        <p>{wallet.label}</p>
                        <p className="text-muted-foreground">
                          {truncateAddress(wallet.address)}
                        </p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-row gap-2">
            <CopyButton disabledCondition={!activeWallet} text={activeWallet?.address || ""} />
          </div>
          <div className="w-[100px] h-[100px]">
            {activeWallet?.address ? (
              <Cuer
                arena="/unitmetal-symbol.svg"
                value={activeWallet?.address || ""}
              />
            ) : (
              <div className="w-full h-full bg-primary/50 text-primary-foreground justify-center items-center flex text-center">
                QR code
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 mt-6 border-t-2 border-primary pt-4">
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="border-primary border rounded-none">
                <TabsTrigger className="rounded-none" value="create">
                  Create
                </TabsTrigger>
                <TabsTrigger className="rounded-none" value="export">
                  Export
                </TabsTrigger>
                <TabsTrigger className="rounded-none" value="import">
                  Import
                </TabsTrigger>
                <TabsTrigger className="rounded-none" value="delete">
                  Delete
                </TabsTrigger>
              </TabsList>
              <TabsContent value="create" className="flex flex-col gap-2">
                <CreateWallet />
              </TabsContent>
              <TabsContent value="export" className="flex flex-col gap-2">
                <ExportWallet />
              </TabsContent>
              <TabsContent value="import" className="flex flex-col gap-2">
                <ImportWallet />
              </TabsContent>
              <TabsContent value="delete" className="flex flex-col gap-2">
                <DeleteWallet />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-4 py-2">
          <p className="text-sm">
            No wallets found. Create a new wallet or import an existing wallet to get started.
          </p>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="border-primary border rounded-none">
              <TabsTrigger className="rounded-none" value="create">
                Create
              </TabsTrigger>
              <TabsTrigger className="rounded-none" value="import">
                Import
              </TabsTrigger>
            </TabsList>
            <TabsContent value="create" className="flex flex-col gap-2">
              <CreateWallet />
            </TabsContent>
            <TabsContent value="import" className="flex flex-col gap-2">
              <ImportWallet />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
