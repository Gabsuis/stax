"use client"

import { useState, useMemo } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useBuildings } from "@/lib/hooks/useBuildings"
import { Building } from "@/types"
import { getLeaseUrgency } from "@/lib/leaseColors"
import { formatSqm, formatPrice } from "@/lib/utils"
import Sidebar from "@/components/Sidebar"
import DashboardStats from "@/components/DashboardStats"
import BuildingModal from "@/components/BuildingModal"
import { differenceInMonths } from "date-fns"
import { Phone, Target, AlertTriangle, TrendingUp, ArrowRight, ArrowLeft, Sparkles, Building2, Clock } from "lucide-react"
import LanguageSwitcher from "@/components/LanguageSwitcher"

interface ActionItem {
  type: "call" | "pitch"
  building: Building
  tenantName?: string
  floorNum?: number
  sqm: number
  monthsLeft?: number
  priority: "urgent" | "high" | "medium"
}

interface VacancyAlert {
  building: Building
  vacantSqm: number
  vacantPct: number
}

interface ExpiringLease {
  building: Building
  tenantName: string
  sqm: number
  floorNum: number
  monthsLeft: number
}

function useMarketInsights(buildings: Building[]) {
  return useMemo(() => {
    const now = new Date()

    // Generate action items
    const actions: ActionItem[] = []
    const vacancyAlerts: VacancyAlert[] = []
    const expiringLeases: ExpiringLease[] = []

    buildings.forEach((b) => {
      // Vacancy alerts: buildings with >20% vacancy
      const vacantPct = b.totalSqm > 0 ? (b.vacantSqm / b.totalSqm) * 100 : 0
      if (b.vacantSqm > 500) {
        vacancyAlerts.push({ building: b, vacantSqm: b.vacantSqm, vacantPct })

        // Pitch action for high-vacancy buildings
        if (vacantPct > 30) {
          actions.push({
            type: "pitch",
            building: b,
            sqm: b.vacantSqm,
            priority: vacantPct > 60 ? "urgent" : "high",
          })
        }
      }

      // Expiring leases
      b.floors.forEach((floor) => {
        floor.blocks.forEach((block) => {
          if (block.leaseEnd && block.status === "occupied") {
            const months = differenceInMonths(block.leaseEnd, now)
            if (months >= 0 && months <= 12) {
              expiringLeases.push({
                building: b,
                tenantName: block.tenantName || "Unknown",
                sqm: block.sqm,
                floorNum: floor.floor,
                monthsLeft: months,
              })

              // Call action for soon-expiring
              actions.push({
                type: "call",
                building: b,
                tenantName: block.tenantName || "Unknown",
                floorNum: floor.floor,
                sqm: block.sqm,
                monthsLeft: months,
                priority: months <= 3 ? "urgent" : months <= 6 ? "high" : "medium",
              })
            }
          }
        })
      })
    })

    // Sort: urgent first
    const priorityOrder = { urgent: 0, high: 1, medium: 2 }
    actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    vacancyAlerts.sort((a, b) => b.vacantPct - a.vacantPct)
    expiringLeases.sort((a, b) => a.monthsLeft - b.monthsLeft)

    return { actions: actions.slice(0, 12), vacancyAlerts: vacancyAlerts.slice(0, 8), expiringLeases: expiringLeases.slice(0, 10) }
  }, [buildings])
}

export default function DashboardPage() {
  const t = useTranslations("dashboard")
  const tI = useTranslations("insights")
  const locale = useLocale()
  const isRtl = locale === "he"
  const Arrow = isRtl ? ArrowLeft : ArrowRight
  const { buildings } = useBuildings()
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)
  const { actions, vacancyAlerts, expiringLeases } = useMarketInsights(buildings)

  const priorityColors = {
    urgent: "bg-rose-500/15 border-rose-500/30 text-rose-400",
    high: "bg-amber-500/15 border-amber-500/30 text-amber-400",
    medium: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
  }

  const priorityDots = {
    urgent: "bg-rose-500",
    high: "bg-amber-500",
    medium: "bg-emerald-500",
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar buildings={buildings} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-7">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display tracking-tight">{t("title")}</h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                {t("subtitle", { count: buildings.length })}
              </p>
            </div>
            <LanguageSwitcher />
          </div>

          {/* Stats Strip */}
          <DashboardStats buildings={buildings} />

          {/* Main Grid: Action Items + Vacancy Alerts */}
          <div className="grid lg:grid-cols-[1fr_380px] gap-5">
            {/* Action Items */}
            <div className="glass-strong rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">{tI("actionItems")}</h2>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-5 ps-11">{tI("actionItemsSub")}</p>

              <div className="space-y-2">
                {actions.map((action, i) => (
                  <div
                    key={`${action.type}-${action.building.id}-${action.tenantName}-${i}`}
                    onClick={() => setSelectedBuilding(action.building)}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-white/[0.03] cursor-pointer transition-colors group border border-transparent hover:border-border/50"
                  >
                    {/* Priority dot */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${priorityDots[action.priority]}`} />

                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${priorityColors[action.priority]}`}>
                      {action.type === "call" ? (
                        <Phone className="w-3.5 h-3.5" />
                      ) : (
                        <Target className="w-3.5 h-3.5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">
                        {action.type === "call" ? (
                          <>
                            <span className="text-foreground">{action.tenantName}</span>
                            <span className="text-muted-foreground"> · </span>
                            <span className="text-muted-foreground">{locale === "he" ? action.building.name : action.building.nameEn}</span>
                          </>
                        ) : (
                          <span className="text-foreground">{locale === "he" ? action.building.name : action.building.nameEn}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {action.type === "call"
                          ? tI("callTenant", { months: tI("monthsLabel", { count: action.monthsLeft ?? 0 }) })
                          : tI("pitchVacancy", { sqm: formatSqm(action.sqm, locale) })
                        }
                      </div>
                    </div>

                    {/* Arrow */}
                    <Arrow className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right column: Vacancy Alerts + Expiring Leases */}
            <div className="space-y-5">
              {/* Vacancy Alerts */}
              <div className="glass-strong rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  </div>
                  <h2 className="text-base font-semibold tracking-tight">{tI("vacancyAlerts")}</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-4 ps-11">{tI("vacancyAlertsSub")}</p>

                <div className="space-y-1.5">
                  {vacancyAlerts.map((alert) => (
                    <div
                      key={alert.building.id}
                      onClick={() => setSelectedBuilding(alert.building)}
                      className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-white/[0.03] cursor-pointer transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{locale === "he" ? alert.building.name : alert.building.nameEn}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatSqm(alert.vacantSqm, locale)}
                        </div>
                      </div>
                      <div className="text-end shrink-0 ms-3">
                        <div className="text-sm font-semibold text-rose-400 data-value">{Math.round(alert.vacantPct)}%</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{tI("highVacancy")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expiring Leases */}
              <div className="glass-strong rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <h2 className="text-base font-semibold tracking-tight">{tI("expiringLeases")}</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-4 ps-11">{tI("expiringLeasesSub")}</p>

                <div className="space-y-1.5">
                  {expiringLeases.map((lease, i) => (
                    <div
                      key={`${lease.building.id}-${lease.tenantName}-${i}`}
                      onClick={() => setSelectedBuilding(lease.building)}
                      className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-white/[0.03] cursor-pointer transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{lease.tenantName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {locale === "he" ? lease.building.name : lease.building.nameEn} · {tI("floorNum", { num: lease.floorNum })}
                        </div>
                      </div>
                      <div className="text-end shrink-0 ms-3">
                        <div className={`text-sm font-semibold data-value ${lease.monthsLeft <= 3 ? "text-rose-400" : lease.monthsLeft <= 6 ? "text-amber-400" : "text-foreground"}`}>
                          {tI("monthsLabel", { count: lease.monthsLeft })}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{formatSqm(lease.sqm, locale)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BuildingModal
        building={selectedBuilding}
        onClose={() => setSelectedBuilding(null)}
      />
    </div>
  )
}
