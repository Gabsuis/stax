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

  const unk = "Unknown"
  const cells = [
    { label: t("totalSqm"), value: building.totalSqm ? formatSqm(building.totalSqm, locale) : unk, color: "" },
    { label: t("vacantSqm"), value: building.vacantSqm ? formatSqm(building.vacantSqm, locale) : unk, color: building.vacantSqm ? "text-lease-red" : "" },
    { label: t("occupancy"), value: occ > 0 ? `${occ}%` : unk, color: occ >= 85 ? "text-lease-green" : occ >= 65 ? "" : occ > 0 ? "text-lease-red" : "" },
    { label: t("floors"), value: building.floorCount ? `${building.floorCount}` : unk, color: "" },
    { label: t("vacantFloors"), value: `${vacantFloors}`, color: vacantFloors > 0 ? "text-lease-red" : "" },
    { label: t("pricePerSqm"), value: building.askingPrice ? formatPrice(building.askingPrice, locale) : unk, color: "" },
    { label: t("managementFee"), value: building.managementFee ? formatPrice(building.managementFee, locale) : unk, color: "" },
    { label: t("finishLevel"), value: deliveryLabel || unk, color: "" },
    { label: "LEED", value: leedLabel || unk, color: leedLabel ? "text-lease-green" : "" },
    { label: t("yearBuilt"), value: building.yearBuilt ? `${building.yearBuilt}` : unk, color: "" },
    { label: t("municipalTax"), value: building.municipalTaxSqm ? formatPrice(building.municipalTaxSqm, locale) : unk, color: "" },
    { label: t("parkingRatio"), value: building.parkingRatio ? `1:${Math.round(1 / building.parkingRatio)}` : unk, color: "" },
  ]

  // Dynamic grid: 4 cols on mobile, up to N cols on desktop
  const colCount = Math.min(cells.length, 12)

  return (
    <div className="mx-7 mb-4 glass-strong rounded-xl overflow-hidden">
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
