"use client"

import { useTranslations } from "next-intl"
import { Building } from "@/types"
import { formatSqm, formatPrice, calcVacantFloors } from "@/lib/utils"

interface Props {
  building: Building
}

export default function KpiStrip({ building }: Props) {
  const t = useTranslations("modal")
  const vacantFloors = calcVacantFloors(building.floors)
  const occ = Math.round(building.occupancy * 100)

  const cells = [
    { label: t("totalSqm"), value: formatSqm(building.totalSqm), color: "" },
    { label: t("vacantSqm"), value: formatSqm(building.vacantSqm), color: "text-lease-red" },
    { label: t("occupancy"), value: `${occ}%`, color: occ >= 85 ? "" : occ >= 65 ? "text-muted-foreground" : "text-lease-red" },
    { label: t("floors"), value: `${building.floorCount}`, color: "" },
    { label: t("vacantFloors"), value: `${vacantFloors}`, color: vacantFloors > 0 ? "text-lease-red" : "" },
    { label: t("pricePerSqm"), value: formatPrice(building.askingPrice), color: "" },
    { label: t("managementFee"), value: building.managementFee ? formatPrice(building.managementFee) : "—", color: "" },
    { label: t("finishLevel"), value: building.finish || "—", color: "text-muted-foreground" },
  ]

  return (
    <div className="grid grid-cols-4 md:grid-cols-8 border-b border-border bg-card/50">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="py-4 px-3 text-center border-s border-border last:border-s-0"
        >
          <div className={`text-xl font-bold tabular-nums ${cell.color}`}>
            {cell.value}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{cell.label}</div>
        </div>
      ))}
    </div>
  )
}
