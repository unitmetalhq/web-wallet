import { useAtom } from "jotai";
import { desktopTabAtom, type DesktopTab } from "@/atoms/desktopTabAtom";

const TABS: { id: DesktopTab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "address-book", label: "Address Book" },
  { id: "backup", label: "Backup" },
  { id: "settings", label: "Settings" },
];

export default function DesktopNavbar() {
  const [activeTab, setActiveTab] = useAtom(desktopTabAtom);

  return (
    <nav className="hidden lg:flex flex-row border-2 border-primary">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActiveTab(tab.id)}
          className={`px-4 py-1 text-sm font-medium hover:cursor-pointer transition-colors ${
            activeTab === tab.id
              ? "bg-primary text-secondary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
