import Script from 'next/script';
import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import SiteHeader from "@/components/site-header";
import Footer from "@/components/footer";
import { Providers } from "@/app/providers";

const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'UnitMetal Web Wallet',
  description: 'Super lightweight web wallet for professionals',
  metadataBase: new URL('https://wallet.unitmetal.com'),
  openGraph: {
    title: 'UnitMetal Web Wallet',
    description: 'Super lightweight web wallet for professionals',
    url: 'https://wallet.unitmetal.com',
    siteName: 'UnitMetal Web Wallet',
    images: [
      {
        url: '/unitmetal-tbn.png',
        width: 1200,
        height: 630,
        alt: 'og-image',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UnitMetal Web Wallet',
    description: 'Super lightweight web wallet for professionals',
    creator: '@unitmetalHQ',
    images: ['/unitmetal-tbn.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <Script
        defer
        src="https://analytics.zxstim.com/script.js"
        data-website-id="4ae58654-f9fd-48c9-aa75-e4ea4da639ff"
      />
      <body
        className={jetBrainsMono.className}
      >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Providers>
              <main className="flex flex-col gap-12 items-center p-6 md:p-10 pb-12">
                <SiteHeader />
                {children}
                <Footer />
              </main>
            </Providers>
          </ThemeProvider>
      </body>
    </html>
  );
}