import { useState } from "react";
import { useAtom } from "jotai";
import { settingsAtom } from "@/atoms/settingsAtom";
import type { RpcEntry } from "@/types/setting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { mainnet } from "wagmi/chains";
import { Save, Trash2, RefreshCw, Check, ShieldCheck } from "lucide-react";
import { validateUrl } from "@/lib/settings";

const DEFAULT_RPC_URL = import.meta.env.VITE_MAINNET_RPC_URL as string;

export default function WalletSettings() {
  const [settings, setSettings] = useAtom(settingsAtom);

  // ── Add RPC form state ────────────────────────────────────────────────────
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  function handleAdd() {
    const err = validateUrl(newUrl);
    if (err) { setAddError(err); return; }
    const entry: RpcEntry = {
      id: crypto.randomUUID(),
      name: newName.trim() || undefined,
      url: newUrl.trim(),
      chainId: mainnet.id,
    };
    setSettings((prev) => ({ ...prev, rpcList: [...prev.rpcList, entry] }));
    setNewName("");
    setNewUrl("");
    setAddError(null);
  }

  function handleDelete(id: string) {
    setSettings((prev) => ({
      ...prev,
      rpcList: prev.rpcList.filter((r) => r.id !== id),
      activeRpc: prev.activeRpc?.id === id ? null : prev.activeRpc,
    }));
    window.location.reload();
  }

  function handleSelect(entry: RpcEntry) {
    setSettings((prev) => ({ ...prev, activeRpc: entry }));
    window.location.reload();
  }

  function handleResetToDefault() {
    setSettings((prev) => ({ ...prev, activeRpc: null }));
    window.location.reload();
  }

  function handleOfflineToggle(checked: boolean) {
    setSettings((prev) => ({ ...prev, offlineMode: checked }));
  }

  const activeUrl = settings.activeRpc?.url ?? DEFAULT_RPC_URL;
  const isUsingCustomRpc = !!settings.activeRpc;

  return (
    <div className="flex flex-col border-2 border-primary gap-2 pb-8">
      <div className="flex flex-row justify-between items-center bg-primary text-secondary pl-1">
        <h1 className="text-md font-bold">Settings</h1>
      </div>

      <div className="flex flex-col gap-6 px-4 py-4">

        {/* ── Active RPC ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">RPC Endpoint</h2>

          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Active</p>
            <div className="flex flex-row items-center gap-2">
              <span className={`text-xs px-1.5 py-0.5 border ${
                isUsingCustomRpc
                  ? "border-primary text-primary"
                  : "border-muted-foreground text-muted-foreground"
              }`}>
                {isUsingCustomRpc ? settings.activeRpc?.name ?? "custom" : "default"}
              </span>
              <code className="text-xs font-mono text-muted-foreground break-all">
                {activeUrl || "—"}
              </code>
            </div>
          </div>

          {isUsingCustomRpc && (
            <Button
              type="button"
              variant="outline"
              className="rounded-none hover:cursor-pointer w-fit"
              onClick={handleResetToDefault}
            >
              Reset to default
            </Button>
          )}
        </div>

        <div className="border-t border-border" />

        {/* ── RPC List ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Saved RPCs</h2>

          {settings.rpcList.length === 0 ? (
            <p className="text-xs text-muted-foreground">No custom RPCs saved yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {settings.rpcList.map((entry) => {
                const isActive = settings.activeRpc?.id === entry.id;
                return (
                  <div
                    key={entry.id}
                    className={`flex flex-row items-center justify-between gap-2 border p-2 ${
                      isActive ? "border-primary" : "border-border"
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      {entry.name && (
                        <p className="text-xs font-medium truncate">{entry.name}</p>
                      )}
                      <code className="text-xs text-muted-foreground font-mono truncate">
                        {entry.url}
                      </code>
                    </div>
                    <div className="flex flex-row gap-1 shrink-0">
                      <Button
                        type="button"
                        variant={isActive ? "default" : "outline"}
                        size="icon"
                        className="rounded-none hover:cursor-pointer w-7 h-7"
                        onClick={() => handleSelect(entry)}
                        title={isActive ? "Currently active" : "Set as active"}
                        disabled={isActive}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-none hover:cursor-pointer hover:text-destructive w-7 h-7"
                        onClick={() => handleDelete(entry.id)}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border" />

        {/* ── Add RPC ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Add RPC</h2>
          <Input
            className="rounded-none text-base"
            placeholder="Name (optional, e.g. Alchemy)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input
            className="rounded-none text-base"
            placeholder="https://..."
            value={newUrl}
            onChange={(e) => { setNewUrl(e.target.value); setAddError(null); }}
            type="url"
          />
          {addError && <p className="text-xs text-destructive">{addError}</p>}
          <Button
            type="button"
            className="rounded-none hover:cursor-pointer w-fit"
            onClick={handleAdd}
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </Button>
        </div>

        <div className="border-t border-border" />

        {/* ── Offline mode ─────────────────────────────────────────────────── */}
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

        <div className="border-t border-border" />

        {/* ── VPN Relay ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-row items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">VPN Relay</h2>
            <span className="text-xs text-muted-foreground border border-border px-1.5 py-0.5">coming soon</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Route RPC traffic through a built-in VPN relay to improve privacy and prevent IP-based tracking by node providers.
          </p>
        </div>

      </div>
    </div>
  );
}
