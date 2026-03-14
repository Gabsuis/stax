"use client"

import { useLocale } from "next-intl"
import { useRouter, usePathname } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchTo = locale === "he" ? "en" : "he"
  const label = locale === "he" ? "EN" : "עב"

  return (
    <button
      onClick={() => router.replace(pathname, { locale: switchTo })}
      className="flex items-center justify-center w-9 h-9 rounded-md bg-secondary text-sm font-semibold hover:bg-secondary/80 transition-colors"
      title={switchTo === "en" ? "Switch to English" : "עבור לעברית"}
    >
      {label}
    </button>
  )
}
