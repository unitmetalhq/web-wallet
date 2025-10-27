"use client";
 
import { useState } from "react";
import { Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
 
export default function CopyButton({text}: {text: string}) {
  const [isCopied, setIsCopied] = useState(false);
 
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
 
    setTimeout(() => {
      setIsCopied(false);
    }, 1000);
  };
 
  return (
    <Button className="rounded-none hover:cursor-pointer w-fit" disabled={isCopied} onClick={copy}>
      {isCopied ?
        <div className="flex flex-row gap-2 items-center">
          <Check className="h-4 w-4" />
          Copied!
        </div> 
        
        : 
        <div className="flex flex-row gap-2 items-center">
          Copy
        </div>
      }
    </Button>
  );
};