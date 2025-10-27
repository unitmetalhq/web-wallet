import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ExternalLink, Rss } from "lucide-react";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="flex flex-col w-full text-left">
      <div className="flex flex-row justify-between items-center bg-primary border-t border-primary text-secondary px-2 font-bold">
        <div>Footer</div>
        <div>_</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 border-2 border-primary">
        <div className="flex flex-col">
          <div className="flex flex-col gap-4 border border-primary p-10">
            <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight mb-4">
              Follow for updates
            </h2>
            <div className="flex flex-row gap-6 items-center">
              <Button className="w-fit rounded-none">
                <a
                  className="flex flex-row gap-2 items-center"
                  href="https://x.com/unitmetalHQ"
                  target="blank"
                >
                  Go to X account <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
              <a
                className="flex flex-row gap-2 items-center underline underline-offset-2"
                target="blank"
                href="https://t.me/unitmetalhq"
              >
                <Rss className="w-4 h-4" />
                Telegram Channel
              </a>
            </div>
          </div>
          <div className="border border-primary p-10 grow">
            <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight mb-6">
              Here are some links
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h3 className="scroll-m-20 text-lg font-semibold tracking-tight mb-2">
                  Team
                </h3>
                <Link href="/about" className="text-muted-foreground text-sm">
                  About
                </Link>
                {/* <Link href="/treasury" className="text-muted-foreground text-sm">Treasury</Link>
                <Link href="/contributors" className="text-muted-foreground text-sm">Contributors</Link> */}
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="scroll-m-20 text-lg font-semibold tracking-tight mb-2">
                  Legal
                </h3>
                <Link href="/privacy" className="text-muted-foreground text-sm">
                  Privacy policy
                </Link>
                {/* <Link href="/community-rules" className="text-muted-foreground text-sm">Community rules</Link> */}
              </div>
              {/* <div className="flex flex-col gap-1">
                <h3 className="scroll-m-20 text-lg font-semibold tracking-tight mb-2">Job board</h3>
                <Link href="/core" className="text-muted-foreground text-sm">Core</Link>
                <Link href="/form-a-team" className="text-muted-foreground text-sm">Form a team</Link>
              </div> */}
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <div className="grow border border-primary p-10">
            <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
              Want to leave feedbacks?
            </h2>
            <p className="leading-7 not-first:mt-6 mb-6">
              We are always looking for feedback to improve the product. Please
              feel free to reach out to us.
            </p>
            <div className="flex flex-col gap-4">
              <a
                className="flex flex-row gap-2 items-center dark:text-blue-400 text-blue-500 underline underline-offset-4 w-fit"
                href="mailto:root@zxstim.com"
                target="_blank"
              >
                Email root@zxstim.com <ExternalLink className="w-4 h-4" />
              </a>
              <a
                className="flex flex-row gap-2 items-center dark:text-blue-400 text-blue-500 underline underline-offset-4 w-fit"
                href="https://github.com/unitmetalhq"
                target="_blank"
              >
                Explore our repositories <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
          <div className="grid grid-cols-3 border border-primary [&>*:not(:last-child)]:border-r *:border-primary">
            <a target="_blank" href="https://x.com/unitmetalHQ">
              <div className="flex py-6 items-center justify-center text-primary-foreground">
                <Image
                  className="dark:invert"
                  src="/x.svg"
                  alt="X"
                  width={28}
                  height={28}
                />
              </div>
            </a>
            <a target="_blank" href="https://github.com/unitmetalhq">
              <div className="flex py-6 items-center justify-center text-primary-foreground">
                <Image
                  className="dark:invert"
                  src="/github.svg"
                  alt="github"
                  width={28}
                  height={28}
                />
              </div>
            </a>
            <a target="_blank" href="https://youtube.com/@zxstim">
              <div className="flex py-6 items-center justify-center text-primary-foreground">
                <Image
                  className="dark:invert"
                  src="/youtube.svg"
                  alt="youtube"
                  width={28}
                  height={28}
                />
              </div>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}