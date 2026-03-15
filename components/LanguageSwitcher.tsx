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
      className="flex items-center gap-2 px-3 py-2 rounded-full glass text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300"
      title={switchTo === "en" ? "Switch to English" : "עבור לעברית"}
    >
      <Globe className="w-4 h-4" />
      <span>{label}</span>
    </button>
  )
}
