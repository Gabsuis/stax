"use client"

import { useTranslations } from "next-intl"
import { Building } from "@/types"
import { formatSqm, formatPrice } from "@/lib/utils"

interface Props {
  buildings: Building[]
}

export default function DashboardStats({ buildings }: Props) {
  const t = useTranslations("dashboard")
  const totalSqm = buildings.reduce((s, b) => s + b.totalSqm, 0)
  const totalVacant = buildings.reduce((s, b) => s + b.vacantSqm, 0)
  const avgOcc = buildings.length
    ? Math.round((buildings.reduce((s, b) => s + b.occupancy, 0) / buildings.length) * 100)
    : 0
  const avgPrice = buildings.length
    ? Math.round(buildings.filter(b => b.askingPrice > 0).reduce((s, b) => s + b.askingPrice, 0) / buildings.filter(b => b.askingPrice > 0).length)
    : 0
  const totalBuildings = buildings.length
  const urgentLeases = buildings.reduce((count, b) => {
    return count + b.floors.reduce((fc, f) => {
      return fc + f.blocks.filter(bl => {
        if (!bl.leaseEnd) return false
        const months = Math.floor((bl.leaseEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
        return months >= 0 && months < 6
      }).length
    }, 0)
  }, 0)

  const stats = [
    { label: t("totalBuildings"), value: `${totalBuildings}`, accent: false },
    { label: t("totalSqm"), value: formatSqm(totalSqm), accent: false },
    { label: t("vacantSqm"), value: formatSqm(totalVacant), accent: true, color: "text-lease-red" },
    { label: t("avgOccupancy"), value: `${avgOcc}%`, accent: avgOcc < 85, color: "text-lease-amber" },
    { label: t("avgPrice"), value: formatPrice(avgPrice), accent: false },
    { label: t("atRiskLeases"), value: `${urgentLeases}`, accent: urgentLeases > 0, color: "text-lease-red" },
  ]

  return (
    <div className="glass-strong rounded-2xl overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`py-5 px-5 ${i > 0 ? "border-s border-border" : ""}`}
          >
            <div className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-3">
              {stat.label}
            </div>
            <div className={`text-2xl font-semibold data-value tracking-tight ${stat.accent ? stat.color : ""}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
