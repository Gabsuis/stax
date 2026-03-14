"use client"

import { useTranslations } from "next-intl"
import { Building } from "@/types"
import { formatSqm, formatPrice } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, TrendingDown, DollarSign, Layers, AlertTriangle, BarChart3 } from "lucide-react"

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
    { label: t("totalBuildings"), value: `${totalBuildings}`, icon: Building2, color: "" },
    { label: t("totalSqm"), value: formatSqm(totalSqm), icon: Layers, color: "" },
    { label: t("vacantSqm"), value: formatSqm(totalVacant), icon: TrendingDown, color: "text-lease-red" },
    { label: t("avgOccupancy"), value: `${avgOcc}%`, icon: BarChart3, color: avgOcc >= 85 ? "" : "text-lease-amber" },
    { label: t("avgPrice"), value: formatPrice(avgPrice), icon: DollarSign, color: "" },
    { label: t("atRiskLeases"), value: `${urgentLeases}`, icon: AlertTriangle, color: urgentLeases > 0 ? "text-lease-red" : "" },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <stat.icon className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <div className={`text-3xl font-bold tabular-nums ${stat.color}`}>
              {stat.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
