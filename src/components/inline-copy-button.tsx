import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function InlineCopyButton({ text }: { text?: string }) {
  const [copied, setCopied] = useState(false);

  if (!text) return null;

  function handleCopy() {
    navigator.clipboard.writeText(text!);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 text-muted-foreground hover:text-foreground hover:cursor-pointer transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}
