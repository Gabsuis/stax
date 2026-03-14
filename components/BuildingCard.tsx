"use client"

import { useTranslations } from "next-intl"
import { Building } from "@/types"
import { formatSqm, formatPrice } from "@/lib/utils"
import MiniStack from "./MiniStack"
import { MapPin } from "lucide-react"

interface Props {
  building: Building
  onSelect: (b: Building) => void
}

export default function BuildingCard({ building, onSelect }: Props) {
  const t = useTranslations("card")
  const occ = Math.round(building.occupancy * 100)

  return (
    <div
      onClick={() => onSelect(building)}
      className="cursor-pointer glass-strong rounded-2xl p-5 transition-all duration-500 glow-hover group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.15em] bg-secondary/50 rounded-full px-2.5 py-0.5">
              {building.class}
            </span>
            {building.area && (
              <span className="text-[10px] text-muted-foreground/40">{building.area}</span>
            )}
          </div>
          <h3 className="text-base font-semibold truncate tracking-tight">{building.name}</h3>
          <p className="text-xs text-muted-foreground/50 truncate mt-0.5">{building.nameEn}</p>
        </div>
        <MiniStack floors={building.floors} />
      </div>

      {/* Key metrics — clean, minimal */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div>
          <div className="text-sm font-semibold data-value">{formatSqm(building.totalSqm)}</div>
          <div className="text-[10px] text-muted-foreground/50 mt-0.5">{t("totalSqm")}</div>
        </div>
        <div>
          <div className="text-sm font-semibold data-value text-lease-red">{formatSqm(building.vacantSqm)}</div>
          <div className="text-[10px] text-muted-foreground/50 mt-0.5">{t("vacantSqm")}</div>
        </div>
        <div>
          <div className="text-sm font-semibold data-value">{formatPrice(building.askingPrice)}</div>
          <div className="text-[10px] text-muted-foreground/50 mt-0.5">{t("pricePerSqm")}</div>
        </div>
      </div>

      {/* Address */}
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-3 h-3 text-muted-foreground/30 shrink-0" />
        <span className="text-[11px] text-muted-foreground/40 truncate">{building.address}</span>
      </div>

      {/* Occupancy bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.1em]">{t("occupancy")}</span>
          <span className={`text-xs font-semibold data-value ${occ >= 85 ? "text-lease-green" : occ >= 65 ? "text-muted-foreground" : "text-lease-red"}`}>
            {occ}%
          </span>
        </div>
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              occ >= 85 ? "bg-lease-green/70" : occ >= 65 ? "bg-muted-foreground/40" : "bg-lease-red/70"
            }`}
            style={{ width: `${occ}%` }}
          />
        </div>
      </div>
    </div>
  )
}
