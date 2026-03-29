"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Building, TenantBlock } from "@/types"
import KpiStrip from "./KpiStrip"
import StackingPlan from "./StackingPlan"
import BlockDetail from "./BlockDetail"
import {
  X, MapPin, User, Phone, Mail, Car, Clock, Leaf, Train,
  UtensilsCrossed, Coffee, Dumbbell, ShoppingBag, Sofa, Presentation,
  Baby, Droplets, Bike, Sun, Zap, FileText, Building2, Calendar,
  ChevronDown, Pencil, Check
} from "lucide-react"
import type { DeliveryCondition, LeedRating } from "@/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDistanceToNow } from "date-fns"
import { formatPrice } from "@/lib/utils"

// Professional amenity display — icon + label
const AMENITY_CONFIG: Record<string, { icon: typeof Dumbbell; label: string }> = {
  restaurant: { icon: UtensilsCrossed, label: "Restaurant" },
  cafe: { icon: Coffee, label: "Café" },
  gym: { icon: Dumbbell, label: "Gym" },
  retail: { icon: ShoppingBag, label: "Retail" },
  lobby_lounge: { icon: Sofa, label: "Lobby Lounge" },
  conference_center: { icon: Presentation, label: "Conference Center" },
  daycare: { icon: Baby, label: "Daycare" },
  synagogue: { icon: Building2, label: "Synagogue" },
  shower_rooms: { icon: Droplets, label: "Showers" },
  bike_storage: { icon: Bike, label: "Bike Storage" },
  rooftop_terrace: { icon: Sun, label: "Rooftop Terrace" },
  ev_charging: { icon: Zap, label: "EV Charging" },
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

const PARKING_LABELS: Record<string, string> = {
  open: "Open", reserved: "Reserved", underground: "Underground",
}

interface Props {
  building: Building | null
  onClose: () => void
}

const LEED_LABELS: Record<string, string> = {
  certified: "Certified",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  none: "None",
  unknown: "Unknown",
}

function EditableRow({
  label,
  value,
  onSave,
  type = "text",
  options,
  href,
}: {
  label: string
  value: string | null | undefined
  onSave: (val: string) => void
  type?: "text" | "select"
  options?: { value: string; label: string }[]
  href?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || "")

  const display = value || "—"
  const style = value ? "text-foreground" : "text-foreground/25 italic"

  if (editing) {
    if (type === "select" && options) {
      return (
        <div className="flex items-center justify-between py-1.5">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Select
            defaultOpen
            value={draft || "none"}
            onValueChange={(val) => { onSave(val === "none" ? "" : (val || "")); setEditing(false) }}
            onOpenChange={(open) => { if (!open) setEditing(false) }}
          >
            <SelectTrigger className="text-xs font-medium bg-secondary/80 border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/30 max-w-[140px] h-auto shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }
    return (
      <div className="flex items-center justify-between py-1.5 gap-2">
        <span className="text-xs text-muted-foreground shrink-0">{label}</span>
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { onSave(draft); setEditing(false) } if (e.key === "Escape") setEditing(false) }}
            autoFocus
            className="text-xs font-medium bg-secondary/80 border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/30 w-[120px] text-end"
          />
          <button onClick={() => { onSave(draft); setEditing(false) }} className="p-0.5 hover:bg-white/[0.06] rounded transition-colors">
            <Check className="w-3 h-3 text-lease-green" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between py-1.5 group">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {href && value ? (
          <a href={href} className={`text-xs font-medium ${style} hover:text-primary transition-colors`}>{display}</a>
        ) : (
          <span className={`text-xs font-medium ${style}`}>{display}</span>
        )}
        <button onClick={() => { setDraft(value || ""); setEditing(true) }} className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/[0.06] rounded transition-all">
          <Pencil className="w-2.5 h-2.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

export default function BuildingModal({ building: initialBuilding, onClose }: Props) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [localBuilding, setLocalBuilding] = useState<Building | null>(null)
  const [kpiOpen, setKpiOpen] = useState(true)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [parkingOpen, setParkingOpen] = useState(false)

  useEffect(() => {
    if (initialBuilding) {
      setLocalBuilding(JSON.parse(JSON.stringify(initialBuilding, (_, v) =>
        v instanceof Date ? v.toISOString() : v
      ), (_, v) => {
        if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v)
        return v
      }))
    } else {
      setLocalBuilding(null)
    }
    setSelectedBlockId(null)
  }, [initialBuilding])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose() },
    [onClose]
  )

  useEffect(() => {
    if (localBuilding) {
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
      return () => {
        document.removeEventListener("keydown", handleKeyDown)
        document.body.style.overflow = ""
      }
    }
  }, [localBuilding, handleKeyDown])

  const handleBuildingUpdate = useCallback((updates: Partial<Building>) => {
    setLocalBuilding((prev) => prev ? { ...prev, ...updates } : prev)
  }, [])

  const handleBlockUpdate = useCallback((blockId: string, updates: Partial<TenantBlock>) => {
    setLocalBuilding((prev) => {
      if (!prev) return prev
      const newFloors = prev.floors.map((floor) => ({
        ...floor,
        blocks: floor.blocks.map((block) =>
          block.id === blockId ? { ...block, ...updates } : block
        ),
      }))
      const totalVacant = newFloors.reduce((sum, f) =>
        sum + f.blocks.filter((b) => b.status === "vacant").reduce((s, b) => s + b.sqm, 0), 0
      )
      const occ = prev.totalSqm > 0 ? (prev.totalSqm - totalVacant) / prev.totalSqm : 0
      return { ...prev, floors: newFloors, vacantSqm: totalVacant, occupancy: occ }
    })
  }, [])

  const building = localBuilding

  const selectedBlock = building
    ? building.floors.flatMap((f) => f.blocks).find((b) => b.id === selectedBlockId) ?? null
    : null

  const deliveryLabel = building?.deliveryCondition
    ? DELIVERY_LABELS[building.deliveryCondition]
    : building?.finish && building.finish !== "—" ? building.finish : null

  const leedLabel = building?.leedRating && building.leedRating !== "unknown" && building.leedRating !== "none"
    ? `LEED ${building.leedRating.charAt(0).toUpperCase() + building.leedRating.slice(1)}`
    : null

  const parkingText = building?.parkingOptions?.length
    ? building.parkingOptions.map((p) =>
        `${PARKING_LABELS[p.parking_type] || p.parking_type}${p.price_monthly ? ` ₪${p.price_monthly}` : ""}`
      ).join(" · ")
    : null

  const transitText = building?.distanceTrainKm || building?.distanceLightRailKm
    ? [
        building.distanceTrainKm ? `${building.distanceTrainKm}km train` : null,
        building.distanceLightRailKm ? `${building.distanceLightRailKm}km light rail` : null,
      ].filter(Boolean).join(" · ")
    : null

  return (
    <AnimatePresence>
      {building && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-background/95 backdrop-blur-2xl border border-border rounded-2xl w-full max-w-[1200px] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-7 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-display tracking-tight truncate">{building.name}</h2>
                  <span className="text-xs text-muted-foreground uppercase tracking-[0.15em] bg-secondary/50 rounded-full px-2.5 py-0.5 shrink-0">{building.class}</span>
                  {leedLabel && (
                    <span className="flex items-center gap-1 text-[10px] text-lease-green bg-lease-green/10 rounded-full px-2 py-0.5 shrink-0">
                      <Leaf className="w-2.5 h-2.5" />
                      {leedLabel}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-foreground/60">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{building.address}</span>
                  {building.city && <span>· {building.city}</span>}
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full glass hover:bg-white/[0.06] transition-all duration-300 shrink-0">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Collapsible KPI Strip */}
            <div className="mx-7 mb-2">
              <button
                onClick={() => setKpiOpen(!kpiOpen)}
                className="flex items-center gap-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${kpiOpen ? "" : "-rotate-90"}`} />
                <span className="uppercase tracking-[0.15em] font-medium">Key Metrics</span>
              </button>
              <AnimatePresence initial={false}>
                {kpiOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="pt-1">
                      <KpiStrip building={building} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Collapsible Details */}
            <div className="mx-7 mb-4">
              <button
                onClick={() => setDetailsOpen(!detailsOpen)}
                className="flex items-center gap-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${detailsOpen ? "" : "-rotate-90"}`} />
                <span className="uppercase tracking-[0.15em] font-medium">Building Details</span>
              </button>
              <AnimatePresence initial={false}>
                {detailsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="glass rounded-xl p-4 mt-1">
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
                        <EditableRow label="Owner" value={building.owner !== "—" ? building.owner : null} onSave={(v) => handleBuildingUpdate({ owner: v })} />
                        <EditableRow label="Contact" value={building.contactName || (building.contact !== "—" ? building.contact : null)} onSave={(v) => handleBuildingUpdate({ contactName: v })} />
                        <EditableRow label="Phone" value={building.contactPhone || (building.phone !== "—" ? building.phone : null)} href={building.contactPhone ? `tel:${building.contactPhone}` : undefined} onSave={(v) => handleBuildingUpdate({ contactPhone: v })} />
                        <EditableRow label="Email" value={building.contactEmail} href={building.contactEmail ? `mailto:${building.contactEmail}` : undefined} onSave={(v) => handleBuildingUpdate({ contactEmail: v })} />
                        <EditableRow label="Year Built" value={building.yearBuilt?.toString()} onSave={(v) => handleBuildingUpdate({ yearBuilt: parseInt(v) || null })} />
                        <EditableRow
                          label="LEED Status"
                          value={leedLabel}
                          type="select"
                          options={Object.entries(LEED_LABELS).filter(([k]) => k !== "unknown").map(([value, label]) => ({ value, label }))}
                          onSave={(v) => handleBuildingUpdate({ leedRating: (v || "none") as LeedRating })}
                        />
                        <EditableRow
                          label="Delivery"
                          value={deliveryLabel}
                          type="select"
                          options={Object.entries(DELIVERY_LABELS).map(([value, label]) => ({ value, label }))}
                          onSave={(v) => handleBuildingUpdate({ deliveryCondition: (v || null) as DeliveryCondition | null })}
                        />
                        <EditableRow label="Mgmt Fee" value={building.managementFee ? `${building.managementFee}` : null} onSave={(v) => handleBuildingUpdate({ managementFee: parseFloat(v) || 0 })} />
                        <EditableRow label="Municipal Tax" value={building.municipalTaxSqm ? `${building.municipalTaxSqm}` : null} onSave={(v) => handleBuildingUpdate({ municipalTaxSqm: parseFloat(v) || null })} />
                        <EditableRow label="Transit" value={transitText} onSave={() => {}} />
                      </div>

                      {/* Parking sub-section */}
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <button
                          onClick={() => setParkingOpen(!parkingOpen)}
                          className="flex items-center gap-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                        >
                          <Car className="w-3 h-3" />
                          <span className="font-medium">Parking</span>
                          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${parkingOpen ? "" : "-rotate-90"}`} />
                        </button>
                        {parkingOpen && (
                          <div className="grid grid-cols-3 gap-x-8 gap-y-0 mt-1 ps-5">
                            <EditableRow
                              label="Per Sqm"
                              value={building.parkingOptions?.length
                                ? building.parkingOptions.map((p) => `${PARKING_LABELS[p.parking_type] || p.parking_type}${p.price_monthly ? ` ₪${p.price_monthly}` : ""}`).join(", ")
                                : null}
                              onSave={() => {}}
                            />
                            <EditableRow label="Parking Ratio" value={building.parkingRatio ? `1:${building.parkingRatio}` : null} onSave={(v) => handleBuildingUpdate({ parkingRatio: parseFloat(v.replace("1:", "")) || null })} />
                            <EditableRow label="Number of Spots" value={building.parkingSpaces?.toString() ?? null} onSave={(v) => handleBuildingUpdate({ parkingSpaces: parseInt(v) || null })} />
                          </div>
                        )}
                      </div>

                      {/* Amenities */}
                      {building.amenities && building.amenities.length > 0 && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 flex-wrap">
                          {building.amenities.map((a) => {
                            const config = AMENITY_CONFIG[a]
                            if (!config) return null
                            const Icon = config.icon
                            return (
                              <span key={a} className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-secondary/40 rounded-full px-2.5 py-1">
                                <Icon className="w-3 h-3" />
                                {config.label}
                              </span>
                            )
                          })}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 text-[10px] text-muted-foreground/40">
                        <Clock className="w-3 h-3" />
                        {building.updatedAt ? (
                          <span>Updated {formatDistanceToNow(new Date(building.updatedAt), { addSuffix: true })}</span>
                        ) : (
                          <span>Update time: Unknown</span>
                        )}
                        {building.sourceDocumentName && (
                          <span className="flex items-center gap-1">
                            · <FileText className="w-3 h-3" /> {building.sourceDocumentName}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden min-h-0">
              <StackingPlan
                building={building}
                selectedBlockId={selectedBlockId}
                onBlockSelect={setSelectedBlockId}
              />
              <BlockDetail
                block={selectedBlock}
                building={building}
                onBlockUpdate={handleBlockUpdate}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
