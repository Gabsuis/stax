"use client"

import { useTranslations, useLocale } from "next-intl"
import { Building } from "@/types"
import { formatSqm, formatPrice, calcVacantFloors } from "@/lib/utils"

interface Props {
  building: Building
}

export default function KpiStrip({ building }: Props) {
  const t = useTranslations("modal")
  const locale = useLocale()
  const vacantFloors = calcVacantFloors(building.floors)
  const occ = Math.round(building.occupancy * 100)

  const cells = [
    { label: t("totalSqm"), value: formatSqm(building.totalSqm, locale), color: "" },
    { label: t("vacantSqm"), value: formatSqm(building.vacantSqm, locale), color: "text-lease-red" },
    { label: t("occupancy"), value: `${occ}%`, color: occ >= 85 ? "text-lease-green" : occ >= 65 ? "" : "text-lease-red" },
    { label: t("floors"), value: `${building.floorCount}`, color: "" },
    { label: t("vacantFloors"), value: `${vacantFloors}`, color: vacantFloors > 0 ? "text-lease-red" : "" },
    { label: t("pricePerSqm"), value: formatPrice(building.askingPrice, locale), color: "" },
    { label: t("managementFee"), value: building.managementFee ? formatPrice(building.managementFee, locale) : "—", color: "" },
    { label: t("finishLevel"), value: building.finish || "—", color: "" },
  ]

  return (
    <div className="mx-7 mb-4 glass-strong rounded-xl overflow-hidden">
      <div className="grid grid-cols-4 md:grid-cols-8">
        {cells.map((cell, i) => (
          <div
            key={cell.label}
            className={`py-3 px-2.5 text-center ${i > 0 ? "border-s border-border" : ""}`}
          >
            <div className={`text-sm font-semibold data-value ${cell.color || "text-foreground"}`}>
              {cell.value}
            </div>
            <div className="text-[10px] text-foreground/60 mt-1 uppercase tracking-[0.1em]">{cell.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
