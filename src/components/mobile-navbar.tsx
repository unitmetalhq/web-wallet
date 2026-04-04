import { useState } from "react";
import ManageWallet from "@/components/manage-wallet";
import BackupWallet from "@/components/backup-wallet";
import SendTokens from "@/components/send-tokens";
import Balances from "@/components/balances";
import WalletSettings from "@/components/wallet-settings";

type Tab = "wallets" | "send" | "balances" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "wallets", label: "Wallets" },
  { id: "send", label: "Send" },
  { id: "balances", label: "Balances" },
  { id: "settings", label: "Settings" },
];

export default function MobileNavbar() {
  const [activeTab, setActiveTab] = useState<Tab>("wallets");

  return (
    <div className="flex flex-col w-full md:hidden">
      <div className="flex-1 pb-16">
        {activeTab === "wallets" && (
          <div className="flex flex-col gap-4">
            <ManageWallet />
            <BackupWallet />
          </div>
        )}
        {activeTab === "send" && <SendTokens />}
        {activeTab === "balances" && <Balances />}
        {activeTab === "settings" && <WalletSettings />}
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t-2 border-primary bg-background grid grid-cols-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`py-3 text-sm font-medium hover:cursor-pointer transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-secondary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
