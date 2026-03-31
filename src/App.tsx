import ManageWallet from "@/components/manage-wallet";
import SendTokens from "@/components/send-tokens";
import Balances from "@/components/balances";
import BackupWallet from "@/components/backup-wallet";
import MobileNavbar from "@/components/mobile-navbar";
// import WalletSettings from "@/components/wallet-settings";

export default function App() {
  return (
    <>
      <MobileNavbar />
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        <div className="flex flex-col gap-4">
          <ManageWallet />
          <BackupWallet />
        </div>
        <SendTokens />
        <div className="flex flex-col gap-4">
          <Balances />
          {/* <WalletSettings /> */}
        </div>
      </div>
    </>
  );
}