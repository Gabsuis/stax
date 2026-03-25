"use client"

import { useTranslations, useLocale } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import { Building } from "@/types"
import { formatSqm } from "@/lib/utils"
import { PenTool, Home, Building2, Sparkles, Database } from "lucide-react"
import Image from "next/image"



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
    { href: "/buildings" as const, label: t("nav.buildings"), icon: Building2 },
    { href: "/editor" as const, label: t("nav.editor"), icon: PenTool },
    { href: "/import" as const, label: t("nav.import"), icon: Database },
    { href: "/dashboard" as const, label: t("nav.dashboard"), icon: Sparkles, special: true },
  ]

  return (
    <aside className="w-[220px] h-screen sticky top-0 shrink-0 border-s border-border bg-sidebar flex flex-col">
      {/* Logo */}
      <div className="px-5 pt-7 pb-6">
        <Link href="/" className="block group">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="STAX" width={28} height={28} className="invert" />
            <div>
              <h1 className="text-lg font-semibold tracking-tight">{t("common.stax")}</h1>
              <p className="text-xs text-muted-foreground tracking-[0.15em] uppercase">{t("common.tagline")}</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {nav.map((item) => {
          const isActive = pathname === item.href
          const isSpecial = "special" in item && item.special

          if (isSpecial) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-300 overflow-hidden ${
                  isActive
                    ? "font-medium"
                    : "hover:bg-amber-500/5"
                }`}
              >
                {/* Shiny background glow when active */}
                {isActive && (
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-amber-500/15 via-yellow-400/10 to-amber-500/15" />
                )}
                {/* Shimmer animation */}
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-amber-400/8 to-transparent animate-shimmer" />
                <item.icon
                  className={`w-4 h-4 relative z-10 ${isActive ? "text-amber-400" : "text-amber-500/60 group-hover:text-amber-400"}`}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <span className={`relative z-10 bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent font-semibold ${!isActive ? "opacity-70 group-hover:opacity-100" : ""} transition-opacity`}>
                  {item.label}
                </span>
              </Link>
            )
          }

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
          <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">{t("dashboard.totalVacant")}</div>
          <div className="text-xl font-semibold data-value text-lease-red">
            {formatSqm(totalVacant, locale)}
          </div>
        </div>
        <div className="rounded-xl glass p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">{t("dashboard.avgOccupancy")}</div>
          <div className="text-xl font-semibold data-value">
            {avgOcc}%
          </div>
        </div>


      </div>
    </aside>
  )
}
