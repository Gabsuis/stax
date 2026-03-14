"use client"

import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import { Building } from "@/types"
import { formatSqm } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { LayoutDashboard, PenTool, Home } from "lucide-react"
import LanguageSwitcher from "./LanguageSwitcher"

interface Props {
  buildings: Building[]
}

export default function Sidebar({ buildings }: Props) {
  const t = useTranslations()
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
    <aside className="w-[240px] h-screen sticky top-0 shrink-0 border-s border-border bg-card/30 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center justify-between">
        <Link href="/" className="block">
          <h1 className="text-2xl font-bold tracking-tight">{t("common.stax")}</h1>
          <p className="text-xs text-muted-foreground tracking-wide mt-0.5">{t("common.tagline")}</p>
        </Link>
        <LanguageSwitcher />
      </div>

      <Separator />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-base transition-colors ${
                isActive
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Portfolio KPIs */}
      <div className="px-3 pb-5 space-y-2.5">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1.5">{t("dashboard.totalVacant")}</div>
          <div className="text-2xl font-bold tabular-nums text-lease-red">
            {formatSqm(totalVacant)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1.5">{t("dashboard.avgOccupancy")}</div>
          <div className="text-2xl font-bold tabular-nums">
            {avgOcc}%
          </div>
        </div>
      </div>
    </aside>
  )
}
