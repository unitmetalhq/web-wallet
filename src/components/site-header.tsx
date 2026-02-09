import { ModeToggle } from "@/components/theme-toggle";

export default function SiteHeader() {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-col gap-2 md:flex-row items-center justify-between w-full">
        <a href="/">
          <img
            src="/unitmetal-full.svg"
            alt="UnitMetal Full Logo"
            width={1200}
            height={200}
            className="max-w-48 dark:invert"
          />
        </a>
        <ModeToggle />
      </div>
      <div className="flex flex-row gap-2 items-center justify-center bg-amber-400 text-black">
        Experimental software
      </div>
    </div>
  );
}
