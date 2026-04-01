import { useAtomValue } from "jotai";
import { desktopTabAtom } from "@/atoms/desktopTabAtom";
import ManageWallet from "@/components/manage-wallet";
import SendTokens from "@/components/send-tokens";
import Balances from "@/components/balances";
import BackupWallet from "@/components/backup-wallet";
import MobileNavbar from "@/components/mobile-navbar";
// import WalletSettings from "@/components/wallet-settings";

export default function App() {
  const desktopTab = useAtomValue(desktopTabAtom);

  return (
    <>
      <MobileNavbar />
      <div className="hidden lg:block w-full">
        {desktopTab === "home" && (
          <div className="grid lg:grid-cols-3 gap-4 w-full">
            <div className="flex flex-col gap-4">
              <ManageWallet />
            </div>
            <SendTokens />
            <div className="flex flex-col gap-4">
              <Balances />
            </div>
          </div>
        )}
        {desktopTab === "backup" && (
          <div className="max-w-lg">
            <BackupWallet />
          </div>
        )}
        {desktopTab === "settings" && (
          <div className="flex flex-col border-2 border-primary gap-2 pb-8 max-w-lg">
            <div className="flex flex-row justify-between items-center bg-primary text-secondary p-1">
              <h1 className="text-lg font-bold">Settings</h1>
            </div>
            <div className="flex flex-col gap-4 px-4 py-2">
              <p className="text-muted-foreground text-sm">No settings available yet.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}