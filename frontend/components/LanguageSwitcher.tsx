"use client"

import { useLocale } from "next-intl"
import { useRouter, usePathname } from "@/i18n/navigation"
import { Globe } from "lucide-react"

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchTo = locale === "he" ? "en" : "he"
  const label = locale === "he" ? "EN" : "עב"

  return (
    <button
      onClick={() => router.replace(pathname, { locale: switchTo })}
      className="inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      title={switchTo === "en" ? "Switch to English" : "עבור לעברית"}
    >
      <Globe className="h-4 w-4" />
      <span className="sr-only">{label}</span>
    </button>
  )
}
