import ManageWallet from "@/components/manage-wallet";
import SendTokens from "@/components/send-tokens";
import BackupWallet from "@/components/backup-wallet";
import Balances from "@/components/balances";

export default function Home() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
      <SendTokens />
      <ManageWallet />
      <Balances />
    </div>
  );
}
