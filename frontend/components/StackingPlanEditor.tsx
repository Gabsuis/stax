"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Plus, Trash2, X, ChevronDown, ChevronUp, Scissors } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCities, type CityInfo } from "@/lib/hooks/useCities"
import type { DeliveryCondition } from "@/types"

// ── Types ──

export interface EditorTenant {
  id: string
  name: string
  isVacant: boolean
  // Optional detail fields
  sqm?: number
  leaseStart?: string   // YYYY-MM
  leaseEnd?: string     // YYYY-MM
  rentPerSqm?: number
  managementFeeSqm?: number
  deliveryCondition?: DeliveryCondition | ''
  isSublease?: boolean
  subleaseTenant?: string
  notes?: string
}

export interface EditorFloor {
  id: string
  floorNumber: number
  tenants: EditorTenant[]
  hasVacancy: boolean
}

export interface EditorBuilding {
  id: string
  name: string
  nameEn: string
  address: string
  city: string
  cityEn: string
  entrance: string
  floorCount: number
  floors: EditorFloor[]
}

interface SelectedTenantRef {
  buildingId: string
  floorId: string
  tenantId: string
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

// ── Convert lobby sign data to editor format ──

export function lobbySignToEditor(signs: {
  building_name: string
  building_name_en: string
  address: string
  city: string
  city_en: string
  entrance: string
  floor_count: number
  floors: { floor_number: string; tenants: string[]; has_vacancy: boolean }[]
}[]): EditorBuilding[] {
  return signs.map((sign) => ({
    id: uid(),
    name: sign.building_name || sign.building_name_en || '',
    nameEn: sign.building_name_en || '',
    address: sign.address || '',
    city: sign.city || '',
    cityEn: sign.city_en || '',
    entrance: sign.entrance || '',
    floorCount: sign.floor_count || 0,
    floors: sign.floors.map((f) => ({
      id: uid(),
      floorNumber: parseInt(f.floor_number) || 0,
      hasVacancy: f.has_vacancy,
      tenants: f.tenants.length > 0
        ? f.tenants.map((t) => ({
            id: uid(),
            name: t,
            isVacant: f.has_vacancy && t.includes('להשכרה'),
          }))
        : [{ id: uid(), name: '', isVacant: false }],
    })),
  }))
}

// ── Convert editor format back to lobby sign format ──

export function editorToLobbySign(buildings: EditorBuilding[]) {
  return buildings.map((b) => ({
    building_name: b.name,
    building_name_en: b.nameEn,
    address: b.address,
    city: b.city,
    city_en: b.cityEn,
    entrance: b.entrance,
    floor_count: b.floorCount,
    floors: b.floors.map((f) => ({
      floor_number: String(f.floorNumber),
      tenants: f.tenants.filter(t => t.name.trim()).map(t => t.name),
      has_vacancy: f.hasVacancy || f.tenants.some(t => t.isVacant),
    })),
  }))
}

// ── Create blank building ──

export function createBlankBuilding(floorCount = 3): EditorBuilding {
  return {
    id: uid(),
    name: '',
    nameEn: '',
    address: '',
    city: '',
    cityEn: '',
    entrance: '',
    floorCount,
    floors: Array.from({ length: floorCount }, (_, i) => ({
      id: uid(),
      floorNumber: i + 1,
      hasVacancy: true,
      tenants: [{ id: uid(), name: '', isVacant: true }],
    })),
  }
}

// ── Delivery condition labels ──
const deliveryLabels: Record<string, string> = {
  shell_and_core: 'Shell & Core',
  as_is: 'As Is',
  as_is_new: 'As Is (New)',
  as_is_high_level: 'As Is (High)',
  turnkey: 'Turnkey',
  furnished: 'Furnished',
  furnished_equipped: 'Furnished & Equipped',
  renovation_required: 'Renovation Required',
}

// ── City Combobox ──

function CityCombobox({
  value,
  onChange,
  cities,
  isHe,
  hasError,
}: {
  value: string
  onChange: (city: string, cityEn: string) => void
  cities: CityInfo[]
  isHe: boolean
  hasError: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = cities.filter(c =>
    !query || c.city.includes(query) || (c.city_en?.toLowerCase().includes(query.toLowerCase()))
  )
  const hasExactMatch = cities.some(c => c.city === query || c.city_en?.toLowerCase() === query.toLowerCase())

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        value={open ? query : value}
        onFocus={() => { setOpen(true); setQuery(value) }}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          onChange(e.target.value, '')
        }}
        onClick={(e) => e.stopPropagation()}
        placeholder={isHe ? "עיר..." : "City..."}
        className={cn(
          "text-xs text-muted-foreground bg-transparent border-b hover:border-border focus:border-primary focus:outline-none transition-colors w-28",
          hasError ? "border-lease-red/60 placeholder:text-lease-red/40" : "border-transparent"
        )}
      />
      {open && (filtered.length > 0 || (query.trim() && !hasExactMatch)) && (
        <div className="absolute top-full start-0 mt-1 z-50 w-48 glass-strong rounded-lg border border-border shadow-2xl overflow-hidden">
          <div className="max-h-40 overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.city}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(c.city, c.city_en || '')
                  setQuery(isHe ? c.city : (c.city_en || c.city))
                  setOpen(false)
                }}
                className="w-full text-start px-3 py-1.5 text-xs hover:bg-white/[0.06] transition-colors flex items-center justify-between"
              >
                <span>{isHe ? c.city : (c.city_en || c.city)}</span>
                {c.count > 0 && <span className="text-muted-foreground/50">{c.count}</span>}
              </button>
            ))}
            {query.trim() && !hasExactMatch && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(query, '')
                  setOpen(false)
                }}
                className="w-full text-start px-3 py-1.5 text-xs hover:bg-white/[0.06] transition-colors text-primary border-t border-border/30"
              >
                + {isHe ? `הוסף "${query}"` : `Add "${query}"`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Component ──

interface StackingPlanEditorProps {
  buildings: EditorBuilding[]
  onChange: (buildings: EditorBuilding[]) => void
  previewUrl?: string | null
  showPreview?: boolean
  compact?: boolean
  locale?: string
}

export default function StackingPlanEditor({
  buildings,
  onChange,
  previewUrl,
  showPreview,
  compact = false,
  locale = 'en',
}: StackingPlanEditorProps) {
  const { cities } = useCities()
  const [expandedBuilding, setExpandedBuilding] = useState<string | null>(
    buildings.length === 1 ? buildings[0]?.id : null
  )
  const [selected, setSelected] = useState<SelectedTenantRef | null>(null)

  // Find the selected tenant object
  const selectedTenant = selected
    ? buildings
        .find(b => b.id === selected.buildingId)
        ?.floors.find(f => f.id === selected.floorId)
        ?.tenants.find(t => t.id === selected.tenantId)
    : null
  const selectedFloorNum = selected
    ? buildings
        .find(b => b.id === selected.buildingId)
        ?.floors.find(f => f.id === selected.floorId)
        ?.floorNumber
    : null

  const updateBuilding = useCallback((buildingId: string, updates: Partial<EditorBuilding>) => {
    onChange(buildings.map(b => b.id === buildingId ? { ...b, ...updates } : b))
  }, [buildings, onChange])

  const updateFloor = useCallback((buildingId: string, floorId: string, updates: Partial<EditorFloor>) => {
    onChange(buildings.map(b => {
      if (b.id !== buildingId) return b
      return { ...b, floors: b.floors.map(f => f.id === floorId ? { ...f, ...updates } : f) }
    }))
  }, [buildings, onChange])

  const addFloor = useCallback((buildingId: string) => {
    onChange(buildings.map(b => {
      if (b.id !== buildingId) return b
      const maxFloor = Math.max(0, ...b.floors.map(f => f.floorNumber))
      const newFloor: EditorFloor = {
        id: uid(),
        floorNumber: maxFloor + 1,
        hasVacancy: true,
        tenants: [{ id: uid(), name: '', isVacant: true }],
      }
      return { ...b, floors: [...b.floors, newFloor], floorCount: Math.max(b.floorCount, maxFloor + 1) }
    }))
  }, [buildings, onChange])

  const removeFloor = useCallback((buildingId: string, floorId: string) => {
    onChange(buildings.map(b => {
      if (b.id !== buildingId) return b
      if (b.floors.length <= 1) return b
      return { ...b, floors: b.floors.filter(f => f.id !== floorId) }
    }))
    if (selected?.floorId === floorId) setSelected(null)
  }, [buildings, onChange, selected])

  const addTenant = useCallback((buildingId: string, floorId: string) => {
    onChange(buildings.map(b => {
      if (b.id !== buildingId) return b
      return {
        ...b,
        floors: b.floors.map(f => {
          if (f.id !== floorId) return f
          return { ...f, tenants: [...f.tenants, { id: uid(), name: '', isVacant: false }] }
        }),
      }
    }))
  }, [buildings, onChange])

  const removeTenant = useCallback((buildingId: string, floorId: string, tenantId: string) => {
    onChange(buildings.map(b => {
      if (b.id !== buildingId) return b
      return {
        ...b,
        floors: b.floors.map(f => {
          if (f.id !== floorId) return f
          if (f.tenants.length <= 1) return { ...f, tenants: [{ id: uid(), name: '', isVacant: true }] }
          return { ...f, tenants: f.tenants.filter(t => t.id !== tenantId) }
        }),
      }
    }))
    if (selected?.tenantId === tenantId) setSelected(null)
  }, [buildings, onChange, selected])

  const updateTenantName = useCallback((buildingId: string, floorId: string, tenantId: string, name: string) => {
    onChange(buildings.map(b => {
      if (b.id !== buildingId) return b
      return {
        ...b,
        floors: b.floors.map(f => {
          if (f.id !== floorId) return f
          return {
            ...f,
            tenants: f.tenants.map(t => t.id === tenantId ? { ...t, name, isVacant: !name.trim() } : t),
          }
        }),
      }
    }))
  }, [buildings, onChange])

  const updateTenantDetails = useCallback((updates: Partial<EditorTenant>) => {
    if (!selected) return
    onChange(buildings.map(b => {
      if (b.id !== selected.buildingId) return b
      return {
        ...b,
        floors: b.floors.map(f => {
          if (f.id !== selected.floorId) return f
          return {
            ...f,
            tenants: f.tenants.map(t => t.id === selected.tenantId ? { ...t, ...updates } : t),
          }
        }),
      }
    }))
  }, [buildings, onChange, selected])

  const splitTenant = useCallback(() => {
    if (!selected || !selectedTenant) return
    const sqm = selectedTenant.sqm || 0
    const halfSqm = Math.round(sqm / 2)
    onChange(buildings.map(b => {
      if (b.id !== selected.buildingId) return b
      return {
        ...b,
        floors: b.floors.map(f => {
          if (f.id !== selected.floorId) return f
          const idx = f.tenants.findIndex(t => t.id === selected.tenantId)
          if (idx === -1) return f
          const newTenants = [...f.tenants]
          newTenants.splice(idx + 1, 0, { id: uid(), name: '', isVacant: true, sqm: sqm - halfSqm })
          newTenants[idx] = { ...newTenants[idx], sqm: halfSqm }
          return { ...f, tenants: newTenants }
        }),
      }
    }))
  }, [buildings, onChange, selected, selectedTenant])

  const addBuilding = useCallback(() => {
    onChange([...buildings, createBlankBuilding()])
  }, [buildings, onChange])

  const removeBuilding = useCallback((buildingId: string) => {
    if (buildings.length <= 1) return
    onChange(buildings.filter(b => b.id !== buildingId))
    if (selected?.buildingId === buildingId) setSelected(null)
  }, [buildings, onChange, selected])

  const isHe = locale === 'he'
  const inputClass = "w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
  const labelClass = "text-[10px] text-muted-foreground uppercase tracking-[0.12em] block mb-1"

  return (
    <div className={cn("flex gap-4", compact ? "" : "")}>
      {/* Main editor area */}
      <div className="flex-1 space-y-4">
        {/* Side-by-side: stacking plan + preview image */}
        <div className={cn("flex gap-4", showPreview && previewUrl ? "flex-row" : "flex-col")}>
          <div className={cn("space-y-4", showPreview && previewUrl ? "flex-1" : "w-full")}>
            {buildings.map((building) => {
              const isExpanded = expandedBuilding === building.id || buildings.length === 1
              const sortedFloors = [...building.floors].sort((a, b) => b.floorNumber - a.floorNumber)
              const tenantCount = building.floors.reduce((sum, f) => sum + f.tenants.filter(t => t.name.trim()).length, 0)

              return (
                <div key={building.id} className="glass-strong rounded-2xl overflow-hidden">
                  {/* Building header */}
                  <div
                    className={cn("p-4 cursor-pointer transition-colors", buildings.length > 1 ? "hover:bg-white/[0.02]" : "")}
                    onClick={() => buildings.length > 1 && setExpandedBuilding(isExpanded ? null : building.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={building.name}
                            onChange={(e) => updateBuilding(building.id, { name: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            placeholder={isHe ? "שם הבניין..." : "Building name..."}
                            className={cn("text-base font-display tracking-tight bg-transparent border-b hover:border-border focus:border-primary focus:outline-none transition-colors flex-1 min-w-0", !building.name.trim() ? "border-lease-red/60 placeholder:text-lease-red/40" : "border-transparent")}
                          />
                          {buildings.length > 1 && (
                            <button onClick={(e) => { e.stopPropagation(); removeBuilding(building.id) }} className="p-1 hover:bg-white/[0.05] rounded transition-colors shrink-0">
                              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input type="text" value={building.address} onChange={(e) => updateBuilding(building.id, { address: e.target.value })} onClick={(e) => e.stopPropagation()} placeholder={isHe ? "כתובת..." : "Address..."} className="text-xs text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors flex-1 min-w-0" />
                          <CityCombobox
                            value={isHe ? (building.city || building.cityEn) : (building.cityEn || building.city)}
                            onChange={(city, cityEn) => updateBuilding(building.id, { city, cityEn: cityEn || building.cityEn })}
                            cities={cities}
                            isHe={isHe}
                            hasError={!(building.city || building.cityEn)?.trim()}
                          />
                          <input type="text" value={building.entrance} onChange={(e) => updateBuilding(building.id, { entrance: e.target.value })} onClick={(e) => e.stopPropagation()} placeholder={isHe ? "כניסה..." : "Entrance..."} className="text-xs text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors w-20" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground glass rounded-full px-2.5 py-1">
                          {building.floors.length} floors · {tenantCount} tenants
                        </span>
                        {buildings.length > 1 && (isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />)}
                      </div>
                    </div>
                  </div>

                  {/* Floors */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-1">
                      <div className="flex flex-col gap-[3px]">
                        {sortedFloors.map((floor) => (
                          <div key={floor.id} className="flex items-center gap-2 group">
                            <input
                              type="number"
                              value={floor.floorNumber}
                              onChange={(e) => updateFloor(building.id, floor.id, { floorNumber: parseInt(e.target.value) || 0 })}
                              className="w-8 shrink-0 text-xs text-foreground/70 font-mono font-medium bg-transparent text-center border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors"
                            />
                            <div className="flex flex-1 gap-[2px] min-h-[40px]">
                              {floor.tenants.map((tenant) => {
                                const isEmpty = !tenant.name.trim()
                                const isVacant = tenant.isVacant || isEmpty
                                const isSelected = selected?.tenantId === tenant.id

                                return (
                                  <div
                                    key={tenant.id}
                                    className={cn("flex-1 flex items-center gap-1 group/tenant relative cursor-pointer transition-all", isSelected && "z-10")}
                                    style={{
                                      minWidth: '40px',
                                      height: 40,
                                      borderRadius: 8,
                                      ...(isVacant
                                        ? { background: 'rgba(255,255,255,0.03)', border: '1.5px dashed rgba(255,255,255,0.15)' }
                                        : { background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(16,185,129,0.10))', borderInlineStart: '3px solid #10b981' }
                                      ),
                                      ...(isSelected
                                        ? { outline: `2px solid ${isVacant ? 'rgba(255,255,255,0.4)' : '#10b981'}`, outlineOffset: -1 }
                                        : {}
                                      ),
                                    }}
                                    onClick={() => setSelected({ buildingId: building.id, floorId: floor.id, tenantId: tenant.id })}
                                  >
                                    <input
                                      type="text"
                                      value={tenant.name}
                                      onChange={(e) => updateTenantName(building.id, floor.id, tenant.id, e.target.value)}
                                      placeholder={isHe ? "שוכר..." : "Tenant..."}
                                      className="w-full h-full bg-transparent px-2 text-xs font-medium focus:outline-none placeholder:text-white/20"
                                      style={{ color: isVacant ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.9)' }}
                                      onClick={(e) => e.stopPropagation()}
                                      onFocus={() => setSelected({ buildingId: building.id, floorId: floor.id, tenantId: tenant.id })}
                                    />
                                    <button
                                      onClick={(e) => { e.stopPropagation(); removeTenant(building.id, floor.id, tenant.id) }}
                                      className="absolute -top-1.5 -end-1.5 w-4 h-4 rounded-full bg-background border border-border flex items-center justify-center opacity-0 group-hover/tenant:opacity-100 transition-opacity z-10"
                                    >
                                      <X className="w-2.5 h-2.5 text-muted-foreground" />
                                    </button>
                                  </div>
                                )
                              })}
                              <button
                                onClick={() => addTenant(building.id, floor.id)}
                                className="w-8 h-[40px] shrink-0 rounded-lg border border-dashed border-border/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:border-primary/30 hover:bg-primary/5"
                              >
                                <Plus className="w-3 h-3 text-muted-foreground" />
                              </button>
                            </div>
                            <button
                              onClick={() => removeFloor(building.id, floor.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-full hover:bg-secondary shrink-0"
                            >
                              <Trash2 className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => addFloor(building.id)} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border/30 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all">
                        <Plus className="w-3 h-3" />{isHe ? "הוסף קומה" : "Add floor"}
                      </button>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(16,185,129,0.12))', borderInlineStart: '2px solid #10b981' }} />
                          {isHe ? "מאוכלס" : "Occupied"}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.15)' }} />
                          {isHe ? "פנוי / לא ידוע" : "Vacant / Unknown"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            <button onClick={addBuilding} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-border/30 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all">
              <Plus className="w-4 h-4" />{isHe ? "הוסף בניין" : "Add building"}
            </button>
          </div>

          {/* Preview image */}
          {showPreview && previewUrl && (
            <div className="w-[300px] shrink-0">
              <div className="glass rounded-xl overflow-hidden sticky top-4">
                <img src={previewUrl} alt="Original" className="w-full object-contain bg-black/20" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Side panel: Tenant details ── */}
      {selectedTenant && selected && (
        <div className="w-[260px] shrink-0">
          <div className="glass-strong rounded-2xl p-4 space-y-3 sticky top-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{isHe ? "פרטי שוכר" : "Tenant Details"}</h3>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] bg-secondary/50 rounded-full px-2 py-0.5">
                  {isHe ? "קומה" : "Floor"} {selectedFloorNum}
                </span>
                <button onClick={() => setSelected(null)} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-secondary transition-colors">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="h-px bg-border" />

            {/* Tenant name */}
            <div>
              <label className={labelClass}>{isHe ? "שם השוכר" : "Tenant Name"}</label>
              <input
                type="text"
                value={selectedTenant.name}
                onChange={(e) => {
                  updateTenantName(selected.buildingId, selected.floorId, selected.tenantId, e.target.value)
                  updateTenantDetails({ isVacant: !e.target.value.trim() })
                }}
                placeholder={isHe ? "פנוי" : "Vacant"}
                className={inputClass}
              />
            </div>

            {/* Area (sqm) */}
            <div>
              <label className={labelClass}>{isHe ? "שטח (מ\"ר)" : "Area (sqm)"}</label>
              <input
                type="number"
                value={selectedTenant.sqm || ''}
                onChange={(e) => updateTenantDetails({ sqm: Number(e.target.value) || 0 })}
                placeholder="0"
                className={inputClass}
              />
            </div>

            {/* Status */}
            <div>
              <label className={labelClass}>{isHe ? "סטטוס" : "Status"}</label>
              <select
                value={selectedTenant.isVacant ? 'vacant' : 'occupied'}
                onChange={(e) => updateTenantDetails({ isVacant: e.target.value === 'vacant' })}
                className={inputClass}
              >
                <option value="occupied">{isHe ? "מאוכלס" : "Occupied"}</option>
                <option value="vacant">{isHe ? "פנוי" : "Vacant"}</option>
              </select>
            </div>

            {/* Lease dates — only if occupied */}
            {!selectedTenant.isVacant && (
              <>
                <div>
                  <label className={labelClass}>{isHe ? "תחילת חוזה" : "Lease Start"}</label>
                  <input
                    type="month"
                    value={selectedTenant.leaseStart || ''}
                    onChange={(e) => updateTenantDetails({ leaseStart: e.target.value || undefined })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{isHe ? "סיום חוזה" : "Lease End"}</label>
                  <input
                    type="month"
                    value={selectedTenant.leaseEnd || ''}
                    onChange={(e) => updateTenantDetails({ leaseEnd: e.target.value || undefined })}
                    className={inputClass}
                  />
                </div>
              </>
            )}

            {/* Rent per sqm */}
            <div>
              <label className={labelClass}>{isHe ? "שכירות למ\"ר (₪)" : "Rent/sqm (₪)"}</label>
              <input
                type="number"
                value={selectedTenant.rentPerSqm || ''}
                onChange={(e) => updateTenantDetails({ rentPerSqm: Number(e.target.value) || undefined })}
                placeholder="—"
                className={inputClass}
              />
            </div>

            {/* Management fee */}
            <div>
              <label className={labelClass}>{isHe ? "דמי ניהול למ\"ר (₪)" : "Mgmt Fee/sqm (₪)"}</label>
              <input
                type="number"
                value={selectedTenant.managementFeeSqm || ''}
                onChange={(e) => updateTenantDetails({ managementFeeSqm: Number(e.target.value) || undefined })}
                placeholder="—"
                className={inputClass}
              />
            </div>

            {/* Delivery condition */}
            <div>
              <label className={labelClass}>{isHe ? "מצב המשרד" : "Delivery"}</label>
              <select
                value={selectedTenant.deliveryCondition || ''}
                onChange={(e) => updateTenantDetails({ deliveryCondition: (e.target.value || undefined) as DeliveryCondition | undefined })}
                className={inputClass}
              >
                <option value="">—</option>
                {Object.entries(deliveryLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            {/* Sublease */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sublease-check"
                checked={selectedTenant.isSublease || false}
                onChange={(e) => updateTenantDetails({ isSublease: e.target.checked })}
                className="rounded border-border"
              />
              <label htmlFor="sublease-check" className="text-xs text-muted-foreground">{isHe ? "שכירות משנה" : "Sublease"}</label>
            </div>

            {selectedTenant.isSublease && (
              <div>
                <label className={labelClass}>{isHe ? "משכיר משנה" : "Sublease From"}</label>
                <input
                  type="text"
                  value={selectedTenant.subleaseTenant || ''}
                  onChange={(e) => updateTenantDetails({ subleaseTenant: e.target.value || undefined })}
                  className={inputClass}
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className={labelClass}>{isHe ? "הערות" : "Notes"}</label>
              <textarea
                value={selectedTenant.notes || ''}
                onChange={(e) => updateTenantDetails({ notes: e.target.value || undefined })}
                rows={2}
                placeholder="—"
                className={cn(inputClass, "resize-none")}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={splitTenant}
                disabled={!selectedTenant.sqm || selectedTenant.sqm < 50}
                className="flex-1 flex items-center justify-center gap-1.5 glass rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Scissors className="w-3 h-3" />
                {isHe ? "פצל" : "Split"}
              </button>
              <button
                onClick={() => { removeTenant(selected.buildingId, selected.floorId, selected.tenantId) }}
                className="glass rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-red-400 transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
