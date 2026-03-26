"use client"

import { useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import { Building } from "@/types"
import { formatSqm } from "@/lib/utils"
import {
  PenTool, Building2, Sparkles, Database, Users, ChevronDown,
  Handshake, UserSearch, BriefcaseBusiness, Receipt
} from "lucide-react"
import Image from "next/image"

interface Props {
  buildings: Building[]
}

export default function Sidebar({ buildings }: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const pathname = usePathname()
  const [crmOpen, setCrmOpen] = useState(
    pathname.startsWith("/crm")
  )
  const totalVacant = buildings.reduce((sum, b) => sum + b.vacantSqm, 0)
  const avgOcc = buildings.length
    ? Math.round((buildings.reduce((sum, b) => sum + b.occupancy, 0) / buildings.length) * 100)
    : 0

  const mainNav = [
    { href: "/buildings" as const, label: t("nav.buildings"), icon: Building2 },
    { href: "/editor" as const, label: t("nav.editor"), icon: PenTool },
    { href: "/import" as const, label: t("nav.import"), icon: Database },
    { href: "/dashboard" as const, label: t("nav.dashboard"), icon: Sparkles },
  ]

  const crmItems = [
    { href: "/crm/contacts" as const, label: t("nav.contacts"), icon: Users },
    { href: "/crm/deals" as const, label: t("nav.deals"), icon: Handshake },
    { href: "/crm/leads" as const, label: t("nav.leads"), icon: UserSearch },
    { href: "/crm/managed-accounts" as const, label: t("nav.managedAccounts"), icon: BriefcaseBusiness },
  ]

  const isCrmActive = pathname.startsWith("/crm")

  function navLinkClass(href: string) {
    const isActive = pathname === href
    return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
      isActive
        ? "bg-primary/8 text-foreground font-medium"
        : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
    }`
  }

  return (
    <aside className="w-[220px] h-screen sticky top-0 shrink-0 border-s border-border bg-sidebar flex flex-col">
      {/* Logo */}
      <div className="px-5 pt-7 pb-6">
        <Link href="/" className="block group">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="STAX" width={28} height={28} className="dark:invert" />
            <div>
              <h1 className="text-lg font-semibold tracking-tight">{t("common.stax")}</h1>
              <p className="text-xs text-muted-foreground tracking-[0.15em] uppercase">{t("common.tagline")}</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {mainNav.map((item) => (
          <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
            <item.icon className="w-4 h-4" strokeWidth={pathname === item.href ? 2 : 1.5} />
            {item.label}
          </Link>
        ))}

        {/* CRM Dropdown */}
        <div className="pt-3 mt-3 border-t border-border/50">
          <button
            onClick={() => setCrmOpen(!crmOpen)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 w-full ${
              isCrmActive
                ? "bg-primary/8 text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
            }`}
          >
            <Users className="w-4 h-4" strokeWidth={isCrmActive ? 2 : 1.5} />
            <span className="flex-1 text-start">{t("nav.crm")}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${crmOpen ? "" : "-rotate-90"}`} />
          </button>
          {crmOpen && (
            <div className="ms-4 mt-0.5 space-y-0.5">
              {crmItems.map((item) => (
                <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
                  <item.icon className="w-3.5 h-3.5" strokeWidth={pathname === item.href ? 2 : 1.5} />
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Invoicing */}
        <div className="pt-3 mt-3 border-t border-border/50">
          <Link href="/invoicing" className={navLinkClass("/invoicing")}>
            <Receipt className="w-4 h-4" strokeWidth={pathname === "/invoicing" ? 2 : 1.5} />
            {t("nav.invoicing")}
          </Link>
        </div>
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
