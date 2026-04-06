import { useState } from "react";
import ManageWallet from "@/components/manage-wallet";
import BackupWallet from "@/components/backup-wallet";
import SendTokens from "@/components/send-tokens";
import Balances from "@/components/balances";
import WalletSettings from "@/components/wallet-settings";
import ManageAddressBook from "@/components/manage-address-book";
import Activity from "@/components/activity";
import { Wallet, BookUser, ArrowUpRight, TableProperties, Save, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Tab = "wallets" | "address-book" | "send" | "activity" | "backup" | "settings";

const TABS: { id: Tab; icon: LucideIcon }[] = [
  { id: "wallets", icon: Wallet },
  { id: "address-book", icon: BookUser },
  { id: "send", icon: ArrowUpRight },
  { id: "activity", icon: TableProperties },
  { id: "backup", icon: Save },
  { id: "settings", icon: Settings },
];

export default function MobileNavbar() {
  const [activeTab, setActiveTab] = useState<Tab>("wallets");

  return (
    <div className="flex flex-col w-full md:hidden">
      <div className="flex-1 pb-16">
        {activeTab === "wallets" && (
          <div className="flex flex-col gap-4">
            <ManageWallet />
            <Balances />
          </div>
        )}
        {activeTab === "address-book" && <ManageAddressBook />}
        {activeTab === "send" && <SendTokens />}
        {activeTab === "activity" && <Activity />}
        {activeTab === "backup" && <BackupWallet />}
        {activeTab === "settings" && <WalletSettings />}
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t-2 border-primary bg-background grid grid-cols-6">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 flex items-center justify-center hover:cursor-pointer transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-secondary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
