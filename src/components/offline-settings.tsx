import { useAtom } from "jotai";
import { settingsAtom } from "@/atoms/settingsAtom";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RefreshCw } from "lucide-react";

export default function OfflineSettings() {
  const [settings, setSettings] = useAtom(settingsAtom);

  function handleOfflineToggle(checked: boolean) {
    setSettings((prev) => ({ ...prev, offlineMode: checked }));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">Offline Mode</h2>
        <p className="text-xs text-muted-foreground">
          Disables all network fetching — balances, gas prices, ENS lookups.
          Use this to sign transactions without broadcasting them.
        </p>
      </div>

      <div className="flex flex-row items-center gap-3">
        <Switch
          checked={settings.offlineMode}
          onCheckedChange={handleOfflineToggle}
          className="rounded-none **:data-[slot=switch-thumb]:rounded-none"
        />
        <Label>
          {settings.offlineMode ? (
            <span className="text-amber-500">Offline — fetching disabled</span>
          ) : (
            <span className="text-muted-foreground">Online</span>
          )}
        </Label>
      </div>

      {settings.offlineMode && (
        <div className="flex flex-row items-start gap-2 border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-500">
          <RefreshCw className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <p>
            All balance and network queries are paused. You can still sign
            transactions — disable offline mode before broadcasting.
          </p>
        </div>
      )}
    </div>
  );
}
