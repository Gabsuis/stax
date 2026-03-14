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
        className="relative flex items-center cursor-pointer transition-all duration-200 overflow-hidden"
        style={{
          width: `${pct}%`,
          minWidth: "24px",
          height: 44,
          borderRadius: 8,
          ...(isVacant
            ? {
                background: "rgba(255,255,255,0.02)",
                border: "1.5px dashed rgba(255,255,255,0.1)",
              }
            : {
                background: `linear-gradient(135deg, ${color}18, ${color}0a)`,
                borderInlineStart: `3px solid ${color}`,
              }),
          ...(isSelected
            ? {
                outline: `2px solid ${isVacant ? "rgba(255,255,255,0.3)" : color}`,
                outlineOffset: -1,
              }
            : {}),
        }}
      >
        {showLabel && (
          <div className="flex flex-col justify-center px-3 min-w-0 w-full">
            <span
              className="truncate leading-tight"
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: isVacant ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.75)",
              }}
            >
              {isVacant ? t("vacant") : block.tenantName}
            </span>
            {!isVacant && pct > 20 && (
              <span
                className="truncate leading-tight data-value"
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                {formatSqm(block.sqm)}
              </span>
            )}
          </div>
        )}
      </TooltipTrigger>
      <TooltipContent side="top" className="glass-strong text-sm rounded-lg">
        <p className="font-medium">{block.tenantName || t("vacant")}</p>
        <p className="text-muted-foreground text-xs">{formatSqm(block.sqm)} · {getLeaseLabel(block.leaseEnd)}</p>
      </TooltipContent>
    </Tooltip>
  )
}
