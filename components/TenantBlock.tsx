"use client"

import { useTranslations } from "next-intl"
import { TenantBlock as TenantBlockType } from "@/types"
import { getLeaseColor, getLeaseLabel } from "@/lib/leaseColors"
import { formatSqm } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Props {
  block: TenantBlockType
  floorTotalSqm: number
  isSelected: boolean
  onSelect: (id: string) => void
}

export default function TenantBlock({ block, floorTotalSqm, isSelected, onSelect }: Props) {
  const t = useTranslations("legend")
  const pct = (block.sqm / floorTotalSqm) * 100
  const showLabel = pct > 12
  const isVacant = block.status === "vacant"
  const color = getLeaseColor(block.leaseEnd)

  return (
    <Tooltip>
      <TooltipTrigger
        onClick={() => onSelect(block.id)}
        className="relative flex items-center cursor-pointer transition-all duration-150 hover:brightness-125 overflow-hidden"
        style={{
          width: `${pct}%`,
          minWidth: "24px",
          height: 44,
          borderRadius: 6,
          ...(isVacant
            ? {
                background: "rgba(255,255,255,0.03)",
                border: "1.5px dashed rgba(255,255,255,0.2)",
              }
            : {
                background: color + "20",
                borderInlineStart: `3px solid ${color}`,
              }),
          ...(isSelected
            ? {
                outline: "2px solid rgba(255,255,255,0.5)",
                outlineOffset: -1,
                filter: "brightness(1.2)",
              }
            : {}),
        }}
      >
        {showLabel && (
          <div className="flex flex-col justify-center px-3 min-w-0 w-full">
            <span
              className="truncate leading-tight"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: isVacant ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.85)",
              }}
            >
              {isVacant ? t("vacant") : block.tenantName}
            </span>
            {!isVacant && pct > 20 && (
              <span
                className="truncate leading-tight"
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                {formatSqm(block.sqm)}
              </span>
            )}
          </div>
        )}
      </TooltipTrigger>
      <TooltipContent side="top" className="text-sm">
        <p className="font-semibold">{block.tenantName || t("vacant")}</p>
        <p className="text-muted-foreground">{formatSqm(block.sqm)} · {getLeaseLabel(block.leaseEnd)}</p>
      </TooltipContent>
    </Tooltip>
  )
}
