"use client"

import { useTranslations } from "next-intl"
import { TenantBlock, Building } from "@/types"
import { getLeaseColor, getLeaseLabel } from "@/lib/leaseColors"
import { formatSqm, formatPrice, formatDate } from "@/lib/utils"
import { MousePointerClick } from "lucide-react"

interface Props {
  block: TenantBlock | null
  building: Building
}

export default function BlockDetail({ block, building }: Props) {
  const t = useTranslations("detail")

  if (!block) {
    return (
      <div className="w-[280px] shrink-0 border-s border-border bg-secondary/30 flex flex-col items-center justify-center gap-3 p-8">
        <MousePointerClick className="w-8 h-8 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground/40 text-center">{t("clickForDetails")}</p>
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
    <div className="w-[280px] shrink-0 border-s border-border bg-secondary/30 overflow-y-auto p-6">
      {/* Status */}
      <div className="flex items-center gap-2.5 mb-4">
        <span className={`text-[10px] uppercase tracking-[0.15em] rounded-full px-3 py-1 ${
          isVacant
            ? "glass text-muted-foreground"
            : "bg-secondary/80 text-foreground"
        }`}>
          {isVacant ? t("vacant") : t("occupied")}
        </span>
        {!isVacant && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-muted-foreground/60">{getLeaseLabel(block.leaseEnd)}</span>
          </div>
        )}
      </div>

      {/* Tenant name */}
      {!isVacant && (
        <h3 className="text-base font-display tracking-tight mb-5">{block.tenantName}</h3>
      )}

      <div className="h-px bg-border mb-5" />

      {/* Detail rows */}
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground/50 uppercase tracking-[0.1em]">{row.label}</span>
            <span className="text-sm font-medium data-value">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Notes */}
      {block.notes && (
        <>
          <div className="h-px bg-border my-5" />
          <div>
            <span className="text-[11px] text-muted-foreground/50 uppercase tracking-[0.1em]">{t("notes")}</span>
            <p className="text-sm mt-2 text-muted-foreground leading-relaxed">{block.notes}</p>
          </div>
        </>
      )}
    </div>
  )
}
