import { ShieldCheck } from "lucide-react";

export default function VpnSettings() {
  return (
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
  );
}
