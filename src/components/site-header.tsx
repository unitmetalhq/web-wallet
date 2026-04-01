import { ThemeToggle } from "@/components/theme-toggle";
import DesktopNavbar from "@/components/desktop-navbar";

export default function SiteHeader() {
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
        <ThemeToggle />
      </div>
      {/* <div className="flex flex-row gap-2 items-center justify-center bg-amber-400 text-black">
        Experimental software
      </div> */}
    </div>
  );
}
