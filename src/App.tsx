import { useAtomValue } from "jotai";
import { desktopTabAtom } from "@/atoms/desktopTabAtom";
import ManageWallet from "@/components/manage-wallet";
import SendTokens from "@/components/send-tokens";
import Balances from "@/components/balances";
import BackupWallet from "@/components/backup-wallet";
import MobileNavbar from "@/components/mobile-navbar";
import WalletSettings from "@/components/wallet-settings";

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
          <div className="w-[760px] mx-auto">
            <BackupWallet />
          </div>
        )}
        {desktopTab === "settings" && (
          <div className="w-[760px] mx-auto">
            <WalletSettings />
          </div>
        )}
      </div>
    </>
  );
}