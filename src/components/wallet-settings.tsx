import { useState } from "react";
import { useAtom } from "jotai";
import { settingsAtom } from "@/atoms/settingsAtom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { mainnet } from "wagmi/chains";
import { RotateCcw, Save, RefreshCw } from "lucide-react";

const DEFAULT_RPC_URL = import.meta.env.VITE_MAINNET_RPC_URL as string;

export default function WalletSettings() {
  const [settings, setSettings] = useAtom(settingsAtom);

  // Local RPC form state — initialise from saved custom RPC or empty
  const [rpcName, setRpcName] = useState(settings.rpc?.name ?? "");
  const [rpcUrl, setRpcUrl] = useState(settings.rpc?.url ?? "");
  const [rpcDirty, setRpcDirty] = useState(false);
  const [rpcError, setRpcError] = useState<string | null>(null);

  const activeRpcUrl = settings.rpc?.url ?? DEFAULT_RPC_URL;
  const isUsingCustomRpc = !!settings.rpc;

  function handleRpcChange(field: "name" | "url", value: string) {
    if (field === "name") setRpcName(value);
    if (field === "url") setRpcUrl(value);
    setRpcDirty(true);
    setRpcError(null);
  }

  function validateRpcUrl(url: string): string | null {
    if (!url.trim()) return "RPC URL is required";
    try {
      const parsed = new URL(url.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return "RPC URL must use http or https";
      }
    } catch {
      return "Invalid URL";
    }
    return null;
  }

  function handleSaveRpc() {
    const err = validateRpcUrl(rpcUrl);
    if (err) {
      setRpcError(err);
      return;
    }
    setSettings((prev) => ({
      ...prev,
      rpc: {
        name: rpcName.trim() || undefined,
        url: rpcUrl.trim(),
        chainId: mainnet.id,
      },
    }));
    setRpcDirty(false);
    // Reload so that providers.tsx re-reads the saved RPC and reinitialises wagmi transport
    window.location.reload();
  }

  function handleResetRpc() {
    setSettings((prev) => ({ ...prev, rpc: null }));
    setRpcName("");
    setRpcUrl("");
    setRpcDirty(false);
    setRpcError(null);
    window.location.reload();
  }

  function handleOfflineToggle(checked: boolean) {
    setSettings((prev) => ({ ...prev, offlineMode: checked }));
  }

  return (
    <div className="flex flex-col border-2 border-primary gap-2 pb-8">
      <div className="flex flex-row justify-between items-center bg-primary text-secondary pl-1">
        <h1 className="text-md font-bold">Settings</h1>
      </div>

      <div className="flex flex-col gap-6 px-4 py-4">

        {/* ── RPC ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold">RPC Endpoint</h2>
            <p className="text-xs text-muted-foreground">
              Override the default Ethereum mainnet RPC. Changes take effect after reload.
            </p>
          </div>

          {/* Active RPC badge */}
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Active</p>
            <div className="flex flex-row items-center gap-2">
              <span
                className={`text-xs px-1.5 py-0.5 border ${
                  isUsingCustomRpc
                    ? "border-primary text-primary"
                    : "border-muted-foreground text-muted-foreground"
                }`}
              >
                {isUsingCustomRpc ? "custom" : "default"}
              </span>
              <code className="text-xs font-mono text-muted-foreground break-all">
                {activeRpcUrl || "—"}
              </code>
            </div>
            {isUsingCustomRpc && settings.rpc?.name && (
              <p className="text-xs text-muted-foreground">{settings.rpc.name}</p>
            )}
          </div>

          {/* RPC form */}
          <div className="flex flex-col gap-2">
            <Input
              className="rounded-none text-base"
              placeholder="Name (optional, e.g. Alchemy)"
              value={rpcName}
              onChange={(e) => handleRpcChange("name", e.target.value)}
            />
            <Input
              className="rounded-none text-base"
              placeholder="https://..."
              value={rpcUrl}
              onChange={(e) => handleRpcChange("url", e.target.value)}
              type="url"
            />
            {rpcError && (
              <p className="text-xs text-destructive">{rpcError}</p>
            )}
          </div>

          <div className="flex flex-row gap-2">
            <Button
              type="button"
              className="rounded-none hover:cursor-pointer flex-1"
              onClick={handleSaveRpc}
              disabled={!rpcDirty && isUsingCustomRpc}
            >
              <Save className="w-3.5 h-3.5" />
              Save &amp; Reload
            </Button>
            {isUsingCustomRpc && (
              <Button
                type="button"
                variant="outline"
                className="rounded-none hover:cursor-pointer"
                onClick={handleResetRpc}
                title="Reset to default RPC"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to Default
              </Button>
            )}
          </div>
        </div>

        <div className="border-t border-border" />

        {/* ── Offline mode ─────────────────────────────────────────────── */}
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

      </div>
    </div>
  );
}
