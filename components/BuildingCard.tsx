"use client"

import { useTranslations } from "next-intl"
import { Building } from "@/types"
import { formatSqm, formatPrice, calcVacantFloors } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import MiniStack from "./MiniStack"
import { MapPin } from "lucide-react"

interface Props {
  building: Building
  onSelect: (b: Building) => void
}

export default function BuildingCard({ building, onSelect }: Props) {
  const t = useTranslations("card")
  const occ = Math.round(building.occupancy * 100)
  const vacantFloors = calcVacantFloors(building.floors)

  return (
    <Card
      onClick={() => onSelect(building)}
      className="cursor-pointer transition-all duration-200 hover:border-foreground/20 hover:shadow-lg hover:shadow-foreground/[0.03] bg-card group"
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="secondary" className="text-xs font-medium shrink-0 px-2 py-0.5">
                {building.class}
              </Badge>
              {building.area && (
                <span className="text-xs text-muted-foreground">{building.area}</span>
              )}
            </div>
            <h3 className="text-lg font-bold truncate">{building.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{building.nameEn}</p>
          </div>
          <MiniStack floors={building.floors} />
        </div>

        <Separator className="mb-4" />

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-3 mb-4">
          <div>
            <div className="text-sm font-semibold tabular-nums">{formatSqm(building.totalSqm)}</div>
            <div className="text-xs text-muted-foreground">{t("totalSqm")}</div>
          </div>
          <div>
            <div className="text-sm font-semibold tabular-nums text-lease-red">{formatSqm(building.vacantSqm)}</div>
            <div className="text-xs text-muted-foreground">{t("vacantSqm")}</div>
          </div>
          <div>
            <div className="text-sm font-semibold tabular-nums">{formatPrice(building.askingPrice)}</div>
            <div className="text-xs text-muted-foreground">{t("pricePerSqm")}</div>
          </div>
          <div>
            <div className="text-sm font-semibold tabular-nums">{building.floorSize.toLocaleString("he-IL")} מ״ר</div>
            <div className="text-xs text-muted-foreground">{t("typicalFloor")}</div>
          </div>
          <div>
            <div className={`text-sm font-semibold tabular-nums ${vacantFloors > 0 ? "text-lease-red" : ""}`}>
              {vacantFloors}
            </div>
            <div className="text-xs text-muted-foreground">{t("vacantFloors")}</div>
          </div>
          <div>
            <div className="text-sm font-semibold tabular-nums">{building.allowance}</div>
            <div className="text-xs text-muted-foreground">{t("allowance")}</div>
          </div>
        </div>

        {/* Address */}
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">{building.address}</span>
        </div>

        {/* Occupancy bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t("occupancy")}</span>
            <span className={`text-sm font-bold tabular-nums ${occ >= 85 ? "" : occ >= 65 ? "text-muted-foreground" : "text-lease-red"}`}>
              {occ}%
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                occ >= 85 ? "bg-foreground" : occ >= 65 ? "bg-muted-foreground" : "bg-lease-red"
              }`}
              style={{ width: `${occ}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
