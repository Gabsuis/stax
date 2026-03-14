import { DM_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google"
import { NextIntlClientProvider, hasLocale } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import { routing } from "@/i18n/routing"
import { TooltipProvider } from "@/components/ui/tooltip"
import "../globals.css"

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
})

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages()
  const dir = locale === "he" ? "rtl" : "ltr"

  return (
    <html lang={locale} dir={dir} className="dark">
      <body className={`${dmSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
