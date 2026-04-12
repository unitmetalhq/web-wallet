import { useRef, useState, useCallback, useEffect } from "react";
import QrScanner from "qr-scanner";
import { QrCode } from "lucide-react";
import { InputGroupButton } from "@/components/ui/input-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Parses an address out of QR code data, handling:
 *   - Plain address:        0xABC...
 *   - ERC-3770 short name:  eth:0xABC...
 *   - CAIP-10 / EIP-155:   eip155:1:0xABC...
 *   - EIP-681 URI:          ethereum:0xABC...@1/transfer?...
 */
function parseQrAddress(raw: string): string | null {
  let candidate = raw.trim();
  if (candidate.includes(":")) {
    const parts = candidate.split(":");
    candidate = parts[parts.length - 1];
  }
  candidate = candidate.split("@")[0].split("/")[0].split("?")[0];
  if (/^0x[0-9a-fA-F]{40}$/.test(candidate)) {
    return candidate;
  }
  return null;
}

export default function QrScannerButton({
  onScan,
}: {
  onScan: (address: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const stopScanner = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
    // qr-scanner's destroy() doesn't stop the MediaStream tracks, so the
    // camera indicator stays on. Stop them explicitly here.
    if (videoRef.current?.srcObject instanceof MediaStream) {
      for (const track of videoRef.current.srcObject.getTracks()) {
        track.stop();
      }
      videoRef.current.srcObject = null;
    }
  }, []);

  function startScanner() {
    // Guard against double-start (e.g. dialog reopened before timeout fires).
    if (!videoRef.current || scannerRef.current) return;
    scannerRef.current = new QrScanner(
      videoRef.current,
      (result) => {
        const parsed = parseQrAddress(result.data);
        if (parsed) {
          onScan(parsed);
          stopScanner();
          setOpen(false);
        }
      },
      {
        returnDetailedScanResult: true,
        highlightScanRegion: true,
        highlightCodeOutline: true,
      }
    );
    scannerRef.current.start().catch(() => setOpen(false));
  }

  function handleOpenChange(next: boolean) {
    if (!next) stopScanner();
    setOpen(next);
  }

  // start scanner once the dialog is open and the video element is mounted
  useEffect(() => {
    if (open) {
      // small defer to let the dialog finish mounting the video element
      const id = setTimeout(() => startScanner(), 50);
      return () => clearTimeout(id);
    }
  }, [open]);

  // stop on unmount
  useEffect(() => () => stopScanner(), [stopScanner]);

  return (
    <>
      <InputGroupButton
        type="button"
        onClick={() => setOpen(true)}
        title="Scan QR code"
        className="hover:cursor-pointer"
      >
        <QrCode className="w-3.5 h-3.5" />
      </InputGroupButton>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
          </DialogHeader>
          <video
            ref={videoRef}
            className="w-full aspect-square object-cover"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
