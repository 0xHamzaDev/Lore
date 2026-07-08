import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, setRequestLocale } from "next-intl/server";
import { Crimson_Pro, IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { Providers } from "@/lib/providers";
import { cn } from "@lore/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lore",
  description: "AI-powered storytelling platform",
};

const crimsonPro = Crimson_Pro({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  variable: "--font-crimson",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["200", "300", "400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={cn(crimsonPro.variable, inter.variable, plexArabic.variable)}
    >
      <body className="font-sans antialiased text-ink bg-canvas">
        <NextIntlClientProvider messages={messages}>
          <Providers dir={dir}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
