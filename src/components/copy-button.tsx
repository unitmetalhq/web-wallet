import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CopyButton({
  text,
  variant = "default",
  disabledCondition = false,
}: {
  text: string;
  variant?: string;
  disabledCondition?: boolean;
}) {
  const [isCopied, setIsCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setIsCopied(true);

    setTimeout(() => {
      setIsCopied(false);
    }, 1000);
  };

  return (
    <Button
      size="sm"
      className="rounded-none hover:cursor-pointer w-fit"
      disabled={isCopied || disabledCondition}
      onClick={copy}
      variant={variant as "default" | "outline" | "secondary" | "ghost" | "link"}
    >
      {isCopied ? (
        <div className="flex flex-row gap-2 items-center">
          <Check className="h-4 w-4" />
          Copied!
        </div>
      ) : (
        <div className="flex flex-row gap-2 items-center">Copy</div>
      )}
    </Button>
  );
}
