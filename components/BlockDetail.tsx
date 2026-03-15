"use client"

import { useState, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import { TenantBlock, Building } from "@/types"
import { getLeaseColor, getLeaseLabelParts } from "@/lib/leaseColors"
import { formatSqm, formatPrice, formatDate } from "@/lib/utils"
import { MousePointerClick, Pencil, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  block: TenantBlock | null
  building: Building
  onBlockUpdate?: (blockId: string, updates: Partial<TenantBlock>) => void
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

  // Reset edit state when block changes
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

  const rows = [
    { label: t("area"), value: formatSqm(block.sqm, locale) },
    { label: t("tenant"), value: block.tenantName || "—" },
    { label: t("askingPrice"), value: formatPrice(building.askingPrice, locale) },
    { label: t("allowance"), value: building.allowance },
    { label: t("finishLevel"), value: building.finish },
    { label: t("leaseEnd"), value: formatDate(block.leaseEnd, locale) },
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

      {/* Tenant name */}
      {!isVacant && (
        <h3 className="text-base font-display tracking-tight mb-5">{block.tenantName}</h3>
      )}

      <div className="h-px bg-border mb-5" />

      {/* Detail rows */}
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-[0.1em]">{row.label}</span>
            <span className="text-sm font-medium data-value">{row.value}</span>
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
    </div>
  )
}
