"use client"

import { useTranslations } from "next-intl"
import { useBuildings } from "@/lib/hooks/useBuildings"
import Sidebar from "@/components/Sidebar"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import ThemeToggle from "@/components/ThemeToggle"
import { Handshake } from "lucide-react"

export default function DealsPage() {
  const t = useTranslations("crm")
  const { buildings } = useBuildings()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar buildings={buildings} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-7">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display tracking-tight">{t("deals")}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t("placeholder")}</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </div>
          <div className="glass-strong rounded-2xl p-16 flex flex-col items-center justify-center text-center">
            <Handshake className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">{t("placeholder")}</p>
          </div>
        </div>
      </main>
    </div>
  )
}
