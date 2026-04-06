import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { ThemeToggle } from "@/components/theme-toggle";
import DesktopNavbar from "@/components/desktop-navbar";
import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

export default function SiteHeader() {
  const setActiveWallet = useSetAtom(activeWalletAtom);

  function handleLogout() {
    setActiveWallet(null);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "o" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        handleLogout();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-row gap-2 items-center justify-between w-full">
        <div className="flex flex-row items-center gap-6">
          <a href="/">
            <img
              src="/unitmetal-symbol.svg"
              alt="UnitMetal Logo"
              width={30}
              height={30}
              className="max-w-48 dark:invert"
            />
          </a>
          <DesktopNavbar />
        </div>
        <div className="flex flex-row items-center gap-2">
          <ThemeToggle />
          <Button
            type="button"
            onClick={handleLogout}
            variant="outline"
            className="rounded-none hover:cursor-pointer w-fit"
          >
            <LogOut />
            <Kbd>O</Kbd>
          </Button>
        </div>
      </div>
    </div>
  );
}
