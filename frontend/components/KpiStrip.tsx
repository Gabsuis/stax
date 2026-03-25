"use client"

import { useTranslations, useLocale } from "next-intl"
import { Building } from "@/types"
import { formatSqm, formatPrice, calcVacantFloors } from "@/lib/utils"

interface Props {
  building: Building
}

const LEED_LABELS: Record<string, string> = {
  platinum: "LEED Platinum",
  gold: "LEED Gold",
  silver: "LEED Silver",
  certified: "LEED Certified",
}

const DELIVERY_LABELS: Record<string, string> = {
  shell_and_core: "Shell & Core",
  as_is: "As-Is",
  as_is_new: "As-Is New",
  as_is_high_level: "As-Is High",
  turnkey: "Turnkey",
  furnished: "Furnished",
  furnished_equipped: "Furnished+",
  renovation_required: "Renovation",
}

export default function KpiStrip({ building }: Props) {
  const t = useTranslations("modal")
  const locale = useLocale()
  const vacantFloors = calcVacantFloors(building.floors)
  const occ = Math.round(building.occupancy * 100)

  const deliveryLabel = building.deliveryCondition
    ? DELIVERY_LABELS[building.deliveryCondition] || building.deliveryCondition
    : building.finish || "—"

  const leedLabel = building.leedRating && building.leedRating !== "unknown" && building.leedRating !== "none"
    ? LEED_LABELS[building.leedRating] || building.leedRating
    : null

  // Core cells — always shown
  const cells: { label: string; value: string; color: string }[] = [
    { label: t("totalSqm"), value: building.totalSqm ? formatSqm(building.totalSqm, locale) : "—", color: "" },
    { label: t("vacantSqm"), value: building.vacantSqm ? formatSqm(building.vacantSqm, locale) : "—", color: building.vacantSqm ? "text-lease-red" : "" },
    { label: t("occupancy"), value: occ > 0 ? `${occ}%` : "—", color: occ >= 85 ? "text-lease-green" : occ >= 65 ? "" : occ > 0 ? "text-lease-red" : "" },
    { label: t("floors"), value: building.floorCount ? `${building.floorCount}` : "—", color: "" },
    { label: t("vacantFloors"), value: `${vacantFloors}`, color: vacantFloors > 0 ? "text-lease-red" : "" },
    { label: t("pricePerSqm"), value: building.askingPrice ? formatPrice(building.askingPrice, locale) : "—", color: "" },
    { label: t("managementFee"), value: building.managementFee ? formatPrice(building.managementFee, locale) : "—", color: "" },
    { label: t("finishLevel"), value: deliveryLabel || "—", color: "" },
  ]
  // Optional cells — only shown when data exists
  if (leedLabel) cells.push({ label: "LEED", value: leedLabel, color: "text-lease-green" })
  if (building.yearBuilt) cells.push({ label: t("yearBuilt"), value: `${building.yearBuilt}`, color: "" })
  if (building.municipalTaxSqm) cells.push({ label: t("municipalTax"), value: formatPrice(building.municipalTaxSqm, locale), color: "" })
  if (building.parkingRatio) cells.push({ label: t("parkingRatio"), value: `1:${Math.round(1 / building.parkingRatio)}`, color: "" })

  // Dynamic grid: 4 cols on mobile, up to N cols on desktop
  const colCount = Math.min(cells.length, 12)

  return (
    <div className="glass-strong rounded-xl overflow-hidden">
      <div className={`grid grid-cols-4 md:grid-cols-${Math.min(colCount, 8)} lg:grid-cols-${colCount}`}
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
      >
        {cells.map((cell, i) => (
          <div
            key={cell.label}
            className={`py-3 px-2.5 text-center ${i > 0 ? "border-s border-border" : ""}`}
          >
            <div className={`text-sm font-semibold data-value ${
              cell.value === "Unknown" ? "text-foreground/20 italic text-xs" : (cell.color || "text-foreground")
            }`}>
              {cell.value}
            </div>
            <div className="text-[10px] text-foreground/60 mt-1 uppercase tracking-[0.1em]">{cell.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
