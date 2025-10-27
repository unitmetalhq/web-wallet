import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "@/components/theme-toggle";

export default function SiteHeader() {
  return (
    <div className="flex flex-col gap-2 md:flex-row items-center justify-between w-full">
      <Link href="/">
        <Image
          src="/unitmetal-full.svg"
          alt="UnitMetal Full Logo"
          width={1200}
          height={200}
          className="max-w-48 dark:invert"
          />
      </Link>
      <ThemeToggle />
    </div>
  )
}