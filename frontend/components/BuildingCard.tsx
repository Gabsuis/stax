"use client"

import { useTranslations, useLocale } from "next-intl"
import { Building } from "@/types"
import { formatSqm, formatPrice } from "@/lib/utils"
import MiniStack from "./MiniStack"
import {
  MapPin, Leaf, Clock,
  UtensilsCrossed, Coffee, Dumbbell, ShoppingBag, Sofa, Presentation,
  Baby, Droplets, Bike, Sun, Zap, Building2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatDistanceToNow } from "date-fns"

const AMENITY_ICONS: Record<string, { icon: typeof Dumbbell; label: string }> = {
  restaurant: { icon: UtensilsCrossed, label: "Restaurant" },
  cafe: { icon: Coffee, label: "Café" },
  gym: { icon: Dumbbell, label: "Gym" },
  retail: { icon: ShoppingBag, label: "Retail" },
  lobby_lounge: { icon: Sofa, label: "Lobby" },
  conference_center: { icon: Presentation, label: "Conference" },
  daycare: { icon: Baby, label: "Daycare" },
  synagogue: { icon: Building2, label: "Synagogue" },
  shower_rooms: { icon: Droplets, label: "Showers" },
  bike_storage: { icon: Bike, label: "Bike Storage" },
  rooftop_terrace: { icon: Sun, label: "Rooftop" },
  ev_charging: { icon: Zap, label: "EV Charging" },
}

interface Props {
  building: Building
  onSelect: (b: Building) => void
}

const AREA_TRANSLATION_KEYS: Record<string, string> = {
  north: "north",
  center: "center",
  south: "south",
}

export default function BuildingCard({ building, onSelect }: Props) {
  const t = useTranslations("card")
  const tF = useTranslations("filters")
  const locale = useLocale()
  const occ = Math.round(building.occupancy * 100)

  const leedLabel = building.leedRating && building.leedRating !== "unknown" && building.leedRating !== "none"
    ? building.leedRating.charAt(0).toUpperCase() + building.leedRating.slice(1)
    : null

  // Build detail line: Class · LEED · Mgmt fee
  const details: string[] = []
  if (building.managementFee) details.push(`₪${building.managementFee} mgmt`)
  if (building.distanceTrainKm) details.push(`${building.distanceTrainKm}km train`)

  return (
    <div
      onClick={() => onSelect(building)}
      className="cursor-pointer glass-strong rounded-2xl p-5 transition-all duration-500 glow-hover group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-[0.15em] bg-secondary/50 rounded-full px-2.5 py-0.5">
              {building.class}
            </span>
            {building.area && (
              <span className="text-xs text-muted-foreground">
                {AREA_TRANSLATION_KEYS[building.area] ? tF(AREA_TRANSLATION_KEYS[building.area]) : building.area}
              </span>
            )}
            {leedLabel && (
              <span className="flex items-center gap-1 text-[10px] text-lease-green bg-lease-green/10 rounded-full px-2 py-0.5">
                <Leaf className="w-2.5 h-2.5" />
                {leedLabel}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold truncate tracking-tight">
            {locale === "he" ? building.name : (building.nameEn || building.name)}
          </h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {locale === "he" ? (building.nameEn || "") : building.name}
          </p>
        </div>
        <MiniStack floors={building.floors} />
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div>
          <div className="text-sm font-semibold data-value">{building.totalSqm ? formatSqm(building.totalSqm, locale) : <span className="text-foreground/25 italic text-xs">Unknown</span>}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{t("totalSqm")}</div>
        </div>
        <div>
          <div className="text-sm font-semibold data-value text-lease-red">{building.vacantSqm ? formatSqm(building.vacantSqm, locale) : <span className="text-foreground/25 italic text-xs">Unknown</span>}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{t("vacantSqm")}</div>
        </div>
        <div>
          <div className="text-sm font-semibold data-value">{building.askingPrice ? formatPrice(building.askingPrice, locale) : <span className="text-foreground/25 italic text-xs">Unknown</span>}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{t("pricePerSqm")}</div>
        </div>
      </div>

      {/* Address */}
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground truncate flex-1">{building.address}</span>
      </div>

      {/* Amenities — icon pills with tooltips */}
      {building.amenities && building.amenities.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          {building.amenities.slice(0, 6).map((a) => {
            const config = AMENITY_ICONS[a]
            if (!config) return null
            const Icon = config.icon
            return (
              <Tooltip key={a}>
                <TooltipTrigger>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary/40 rounded-full px-2 py-0.5">
                    <Icon className="w-2.5 h-2.5" />
                    {config.label}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">{config.label}</TooltipContent>
              </Tooltip>
            )
          })}
          {building.amenities.length > 6 && (
            <span className="text-[10px] text-muted-foreground/40">+{building.amenities.length - 6}</span>
          )}
        </div>
      )}

      {/* Detail line */}
      {details.length > 0 && (
        <div className="text-[10px] text-muted-foreground/50 mb-3 truncate">
          {details.join(" · ")}
        </div>
      )}

      {/* Occupancy bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-[0.1em]">{t("occupancy")}</span>
          {occ > 0 ? (
            <span className={cn(
              "text-xs font-semibold data-value",
              occ >= 85 ? "text-lease-green" : occ >= 65 ? "text-muted-foreground" : "text-lease-red"
            )}>
              {occ}%
            </span>
          ) : (
            <span className="text-xs text-foreground/25 italic">Unknown</span>
          )}
        </div>
        {occ > 0 && (
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                occ >= 85 ? "bg-lease-green/70" : occ >= 65 ? "bg-muted-foreground/40" : "bg-lease-red/70"
              )}
              style={{ width: `${occ}%` }}
            />
          </div>
        )}
      </div>

      {/* Freshness */}
      {building.updatedAt && (
        <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground/40">
          <Clock className="w-2.5 h-2.5" />
          <span>{formatDistanceToNow(new Date(building.updatedAt), { addSuffix: true })}</span>
          {building.sourceDocumentName && (
            <span className="truncate">· {building.sourceDocumentName}</span>
          )}
        </div>
      )}
    </div>
  )
}
