import { Cloud } from "lucide-react";

export default function CloudSync() {
  return (
    <div className="flex flex-col border-2 border-primary gap-2 pb-8">
      <div className="flex flex-row justify-between items-center bg-primary text-secondary pl-1">
        <h1 className="text-md font-bold">Cloud sync</h1>
      </div>

      <div className="flex flex-col gap-4 px-4 py-2">
        <div className="flex flex-row items-center gap-2">
          <Cloud className="w-5 h-5 shrink-0" />
          <span className="text-md font-medium uppercase tracking-wide">Coming soon</span>
        </div>
        <p className="text-muted-foreground">
          Cloud Sync lets you store your encrypted wallet backup directly on UnitMetal's secure cloud infrastructure —
          always with your data encrypted and no unencrypted data ever leaving your device.
        </p>
      </div>
    </div>
  );
}
