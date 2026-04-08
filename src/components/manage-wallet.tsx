import { useAtomValue, useSetAtom } from "jotai";
import CreateWallet from "@/components/create-wallet";
import type { UmKeystore } from "@/types/wallet";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
} from "@/components/ui/select";
import { truncateAddress } from "@/lib/utils";
import { walletsAtom } from "@/atoms/walletsAtom";
import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import InlineCopyButton from "@/components/inline-copy-button";
import { Cuer } from "cuer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ExportWallet from "@/components/export-wallet";
import DeleteWallet from "@/components/delete-wallet";
import ImportWallet from "@/components/import-wallet";
import MigrationWalletStorage from "@/components/migration-wallet-storage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QrCode } from "lucide-react";


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
    if (!value) {
      setActiveWallet(null);
      return;
    }
    setActiveWallet(
      wallets.find((wallet) => wallet.id === value) ?? null
    );
  }

  return (
    <div className="flex flex-col border-2 border-primary gap-2 pb-6">
      <div className="flex flex-row justify-between items-center bg-primary text-secondary pl-1">
        <h1 className="text-md font-bold">Wallets</h1>
      </div>
      {wallets && wallets.length > 0 ? (
        <div className="flex flex-col gap-4 px-4 py-2">
          <div className="flex flex-col gap-2">
            <Select value={activeWallet?.id ?? null} onValueChange={handleSelectWallet}>
              <SelectTrigger className="w-full border-primary border rounded-none">
                {activeWallet ? (
                  <p>{activeWallet.name}</p>
                ) : (
                  <p className="text-muted-foreground">No wallet selected</p>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={null}>
                    <p className="text-muted-foreground">No wallet selected</p>
                  </SelectItem>
                  <SelectSeparator />
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
          <div className="flex flex-row gap-1 items-center">
            <p className="text-xs text-muted-foreground font-mono break-all">{activeWallet?.address}</p>
            <InlineCopyButton text={activeWallet?.address} />
          </div>
          <Dialog>
            <DialogTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none hover:cursor-pointer"
                  disabled={!activeWallet?.address}
                  size="icon"
                />
              }
            >
              <QrCode />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>QR Code</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4">
                <div className="w-[200px] h-[200px]">
                  <Cuer arena="/icon.svg" value={activeWallet?.address || ""} />
                </div>
                <p className="text-xs font-mono break-all text-center text-muted-foreground">
                  {activeWallet?.address}
                </p>
              </div>
            </DialogContent>
          </Dialog>
          <MigrationWalletStorage />
          <Accordion className="border-t-2 border-primary">
            <AccordionItem value="manage-wallets" className="border-none">
              <AccordionTrigger className="pt-2 hover:no-underline font-medium">
                Manage
              </AccordionTrigger>
              <AccordionContent>
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
