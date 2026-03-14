"use client"

import { useLocale } from "next-intl"
import { useRouter, usePathname } from "@/i18n/navigation"

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchTo = locale === "he" ? "en" : "he"
  const label = locale === "he" ? "EN" : "עב"

  return (
    <button
      onClick={() => router.replace(pathname, { locale: switchTo })}
      className="flex items-center justify-center w-8 h-8 rounded-full glass text-xs font-semibold text-muted-foreground hover:text-foreground transition-all duration-300"
      title={switchTo === "en" ? "Switch to English" : "עבור לעברית"}
    >
      {label}
    </button>
  )
}
