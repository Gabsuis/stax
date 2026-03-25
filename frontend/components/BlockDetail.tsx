"use client"

import { useState, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import { TenantBlock, Building } from "@/types"
import { getLeaseColor, getLeaseLabelParts } from "@/lib/leaseColors"
import { formatSqm, formatPrice, formatDate } from "@/lib/utils"
import { MousePointerClick, Pencil, Check, X, ArrowRightLeft, Clock, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"

interface Props {
  block: TenantBlock | null
  building: Building
  onBlockUpdate?: (blockId: string, updates: Partial<TenantBlock>) => void
}

const DELIVERY_LABELS: Record<string, string> = {
  shell_and_core: "Shell & Core",
  as_is: "As-Is",
  as_is_new: "As-Is New",
  as_is_high_level: "As-Is High Level",
  turnkey: "Turnkey",
  furnished: "Furnished",
  furnished_equipped: "Furnished & Equipped",
  renovation_required: "Renovation Required",
}

export default function BlockDetail({ block, building, onBlockUpdate }: Props) {
  const t = useTranslations("detail")
  const tLease = useTranslations("lease")
  const locale = useLocale()
  const [editing, setEditing] = useState(false)
  const [editTenant, setEditTenant] = useState("")
  const [editSqm, setEditSqm] = useState("")
  const [editLeaseEnd, setEditLeaseEnd] = useState("")
  const [editNotes, setEditNotes] = useState("")

  useEffect(() => {
    setEditing(false)
  }, [block?.id])

  if (!block) {
    return (
      <div className="w-[280px] shrink-0 border-s border-border bg-secondary/30 flex flex-col items-center justify-center gap-3 p-8">
        <MousePointerClick className="w-8 h-8 text-foreground/30" />
        <p className="text-sm text-muted-foreground text-center">{t("clickForDetails")}</p>
      </div>
    )
  }

  const isVacant = block.status === "vacant"
  const color = getLeaseColor(block.leaseEnd)
  const leaseParts = getLeaseLabelParts(block.leaseEnd)
  const leaseLabel = tLease(leaseParts.key, leaseParts.params)

  const startEditing = () => {
    setEditTenant(block.tenantName || "")
    setEditSqm(String(block.sqm))
    setEditLeaseEnd(block.leaseEnd ? block.leaseEnd.toISOString().split("T")[0] : "")
    setEditNotes(block.notes || "")
    setEditing(true)
  }

  const saveEdits = () => {
    if (!onBlockUpdate) return
    const tenantName = editTenant.trim() || null
    const sqm = parseInt(editSqm) || block.sqm
    const leaseEnd = editLeaseEnd ? new Date(editLeaseEnd) : null
    const status = tenantName ? "occupied" as const : "vacant" as const
    onBlockUpdate(block.id, {
      tenantName,
      sqm,
      leaseEnd,
      status,
      notes: editNotes.trim() || undefined,
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="w-[280px] shrink-0 border-s border-border bg-secondary/30 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">{t("modify")}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-xs" onClick={() => setEditing(false)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-[0.1em] block mb-1.5">{t("tenant")}</label>
            <input
              type="text"
              value={editTenant}
              onChange={(e) => setEditTenant(e.target.value)}
              placeholder={t("vacant")}
              className="w-full bg-secondary/80 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-[0.1em] block mb-1.5">{t("area")}</label>
            <input
              type="number"
              value={editSqm}
              onChange={(e) => setEditSqm(e.target.value)}
              className="w-full bg-secondary/80 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-[0.1em] block mb-1.5">{t("leaseEnd")}</label>
            <input
              type="date"
              value={editLeaseEnd}
              onChange={(e) => setEditLeaseEnd(e.target.value)}
              className="w-full bg-secondary/80 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-[0.1em] block mb-1.5">{t("notes")}</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={2}
              className="w-full bg-secondary/80 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <Button variant="default" size="sm" className="flex-1" onClick={saveEdits}>
            <Check className="w-3 h-3" />
            {t("save")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            {t("cancel")}
          </Button>
        </div>
      </div>
    )
  }

  // Build detail rows — ALWAYS show every field, "Unknown" for missing
  const unk = "Unknown"
  const delivery = block.deliveryCondition || building.deliveryCondition

  const rows: { label: string; value: string; highlight?: string }[] = [
    { label: t("area"), value: formatSqm(block.sqm, locale) },
    { label: t("tenant"), value: block.tenantName || (isVacant ? "Vacant" : unk) },
    { label: t("askingPrice"), value: building.askingPrice ? formatPrice(building.askingPrice, locale) : unk },
    { label: t("rentPerSqm"), value: block.rentPerSqm ? formatPrice(block.rentPerSqm, locale) : unk, highlight: block.rentPerSqm ? "text-lease-green" : "" },
    { label: t("mgmtFeeBlock"), value: block.managementFeeSqm ? formatPrice(block.managementFeeSqm, locale) : (building.managementFee ? formatPrice(building.managementFee, locale) : unk) },
    { label: t("allowance"), value: building.allowance || unk },
    { label: t("finishLevel"), value: delivery ? (DELIVERY_LABELS[delivery] || delivery) : (building.finish && building.finish !== "—" ? building.finish : unk) },
    { label: t("leaseStart"), value: block.leaseStart ? formatDate(block.leaseStart, locale) : unk },
    { label: t("leaseEnd"), value: block.leaseEnd ? formatDate(block.leaseEnd, locale) : unk },
    { label: t("escalation"), value: block.escalationPct
      ? (block.escalationIndex ? `${block.escalationPct}% (${block.escalationIndex})` : `${block.escalationPct}%`)
      : unk },
    { label: t("options"), value: block.optionPeriods && block.optionPeriods > 0
      ? `${block.optionPeriods} × ${block.optionYears || 0}y`
      : unk },
    { label: t("availableFrom"), value: isVacant
      ? (block.availableFrom ? formatDate(block.availableFrom, locale) : "Immediate")
      : "N/A" },
  ]

  return (
    <div className="w-[280px] shrink-0 border-s border-border bg-secondary/30 overflow-y-auto p-6">
      {/* Status + Modify */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className={`text-xs uppercase tracking-[0.15em] rounded-full px-3 py-1 ${
            isVacant
              ? "glass text-muted-foreground"
              : "bg-secondary/80 text-foreground"
          }`}>
            {isVacant ? t("vacant") : t("occupied")}
          </span>
          {!isVacant && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-muted-foreground">{leaseLabel}</span>
            </div>
          )}
        </div>
        {onBlockUpdate && (
          <Button variant="ghost" size="icon-xs" onClick={startEditing} title={t("modify")}>
            <Pencil className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Sublease badge */}
      {block.isSublease && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div>
            <span className="text-xs font-medium text-amber-400">{t("sublease")}</span>
            {block.subleaseTenant && (
              <span className="text-xs text-amber-400/70 ms-1">· {block.subleaseTenant}</span>
            )}
          </div>
        </div>
      )}

      {/* Tenant name */}
      {!isVacant && (
        <h3 className="text-base font-display tracking-tight mb-5">{block.tenantName}</h3>
      )}

      <div className="h-px bg-border mb-5" />

      {/* Detail rows */}
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-[0.1em]">{row.label}</span>
            <span className={`text-sm font-medium data-value ${
              row.value === "Unknown" ? "text-foreground/20 italic" :
              row.value === "N/A" ? "text-foreground/15 italic" :
              row.highlight || ""
            }`}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Notes */}
      {block.notes && (
        <>
          <div className="h-px bg-border my-5" />
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-[0.1em]">{t("notes")}</span>
            <p className="text-sm mt-2 text-muted-foreground leading-relaxed">{block.notes}</p>
          </div>
        </>
      )}

      {/* Freshness timestamp */}
      {block.updatedAt && (
        <>
          <div className="h-px bg-border my-5" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
            <Clock className="w-3 h-3" />
            <span>{t("lastUpdated")}: {formatDistanceToNow(new Date(block.updatedAt), { addSuffix: true })}</span>
          </div>
        </>
      )}
    </div>
  )
}
