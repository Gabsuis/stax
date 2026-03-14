"use client"

import { useTranslations } from "next-intl"
import { TenantBlock, Building } from "@/types"
import { getLeaseColor, getLeaseLabel } from "@/lib/leaseColors"
import { formatSqm, formatPrice, formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MousePointerClick } from "lucide-react"

interface Props {
  block: TenantBlock | null
  building: Building
}

export default function BlockDetail({ block, building }: Props) {
  const t = useTranslations("detail")

  if (!block) {
    return (
      <div className="w-[300px] shrink-0 border-s border-border bg-card/50 flex flex-col items-center justify-center gap-3 p-8">
        <MousePointerClick className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-base text-muted-foreground text-center">{t("clickForDetails")}</p>
      </div>
    )
  }

  const isVacant = block.status === "vacant"
  const color = getLeaseColor(block.leaseEnd)

  const rows = [
    { label: t("area"), value: formatSqm(block.sqm) },
    { label: t("tenant"), value: block.tenantName || "—" },
    { label: t("askingPrice"), value: formatPrice(building.askingPrice) },
    { label: t("allowance"), value: building.allowance },
    { label: t("finishLevel"), value: building.finish },
    { label: t("leaseEnd"), value: formatDate(block.leaseEnd) },
  ]

  return (
    <div className="w-[300px] shrink-0 border-s border-border bg-card/50 overflow-y-auto p-6">
      {/* Status */}
      <div className="flex items-center gap-2.5 mb-4">
        <Badge variant={isVacant ? "outline" : "secondary"} className="text-sm px-3 py-1">
          {isVacant ? t("vacant") : t("occupied")}
        </Badge>
        {!isVacant && (
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm text-muted-foreground">{getLeaseLabel(block.leaseEnd)}</span>
          </div>
        )}
      </div>

      {/* Tenant name */}
      {!isVacant && (
        <h3 className="text-lg font-bold mb-4">{block.tenantName}</h3>
      )}

      <Separator className="mb-5" />

      {/* Detail rows */}
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className="text-base font-semibold">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Notes */}
      {block.notes && (
        <>
          <Separator className="my-5" />
          <div>
            <span className="text-sm text-muted-foreground">{t("notes")}</span>
            <p className="text-base mt-1.5">{block.notes}</p>
          </div>
        </>
      )}
    </div>
  )
}
