"use client"

import { useTranslations, useLocale } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import { Building } from "@/types"
import { formatSqm } from "@/lib/utils"
import { LayoutDashboard, PenTool, Home } from "lucide-react"
import LanguageSwitcher from "./LanguageSwitcher"

interface Props {
  buildings: Building[]
}

export default function Sidebar({ buildings }: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const pathname = usePathname()
  const totalVacant = buildings.reduce((sum, b) => sum + b.vacantSqm, 0)
  const avgOcc = buildings.length
    ? Math.round((buildings.reduce((sum, b) => sum + b.occupancy, 0) / buildings.length) * 100)
    : 0

  const nav = [
    { href: "/" as const, label: t("nav.home"), icon: Home },
    { href: "/dashboard" as const, label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/editor" as const, label: t("nav.editor"), icon: PenTool },
  ]

  return (
    <aside className="w-[220px] h-screen sticky top-0 shrink-0 border-s border-border bg-sidebar flex flex-col">
      {/* Logo */}
      <div className="px-5 pt-7 pb-6">
        <Link href="/" className="block group">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="font-display text-base text-primary font-normal italic">S</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">{t("common.stax")}</h1>
              <p className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase">{t("common.tagline")}</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {nav.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                isActive
                  ? "bg-primary/8 text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
              }`}
            >
              <item.icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.5} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Portfolio KPIs */}
      <div className="px-3 pb-4 space-y-2">
        <div className="rounded-xl glass p-4">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">{t("dashboard.totalVacant")}</div>
          <div className="text-xl font-semibold data-value text-lease-red">
            {formatSqm(totalVacant, locale)}
          </div>
        </div>
        <div className="rounded-xl glass p-4">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">{t("dashboard.avgOccupancy")}</div>
          <div className="text-xl font-semibold data-value">
            {avgOcc}%
          </div>
        </div>
        <div className="px-1 pt-1">
          <LanguageSwitcher />
        </div>
      </div>
    </aside>
  )
}
