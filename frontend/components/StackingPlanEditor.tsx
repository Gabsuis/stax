"use client"

import { useState, useCallback } from "react"
import { Plus, Trash2, X, GripVertical, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ──

export interface EditorTenant {
  id: string
  name: string
  isVacant: boolean
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
        : [{ id: uid(), name: '', isVacant: false }], // empty floor gets one empty slot
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

// ── Component ──

interface StackingPlanEditorProps {
  buildings: EditorBuilding[]
  onChange: (buildings: EditorBuilding[]) => void
  previewUrl?: string | null
  showPreview?: boolean
  compact?: boolean // for import page (less padding)
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
  const [expandedBuilding, setExpandedBuilding] = useState<string | null>(
    buildings.length === 1 ? buildings[0]?.id : null
  )

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
  }, [buildings, onChange])

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
  }, [buildings, onChange])

  const updateTenant = useCallback((buildingId: string, floorId: string, tenantId: string, name: string) => {
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

  const addBuilding = useCallback(() => {
    onChange([...buildings, createBlankBuilding()])
  }, [buildings, onChange])

  const removeBuilding = useCallback((buildingId: string) => {
    if (buildings.length <= 1) return
    onChange(buildings.filter(b => b.id !== buildingId))
  }, [buildings, onChange])

  const isHe = locale === 'he'

  return (
    <div className={cn("space-y-4", compact ? "" : "")}>
      {/* Side-by-side: editor + preview image */}
      <div className={cn("flex gap-4", showPreview && previewUrl ? "flex-row" : "flex-col")}>
        {/* Editor */}
        <div className={cn("space-y-4", showPreview && previewUrl ? "flex-1" : "w-full")}>
          {buildings.map((building) => {
            const isExpanded = expandedBuilding === building.id || buildings.length === 1
            const sortedFloors = [...building.floors].sort((a, b) => b.floorNumber - a.floorNumber)
            const tenantCount = building.floors.reduce((sum, f) => sum + f.tenants.filter(t => t.name.trim()).length, 0)

            return (
              <div key={building.id} className="glass-strong rounded-2xl overflow-hidden">
                {/* Building header — always visible */}
                <div
                  className={cn(
                    "p-4 cursor-pointer transition-colors",
                    buildings.length > 1 ? "hover:bg-white/[0.02]" : ""
                  )}
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
                          className="text-base font-display tracking-tight bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors flex-1 min-w-0"
                        />
                        {buildings.length > 1 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); removeBuilding(building.id) }}
                            className="p-1 hover:bg-white/[0.05] rounded transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={building.address}
                          onChange={(e) => updateBuilding(building.id, { address: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          placeholder={isHe ? "כתובת..." : "Address..."}
                          className="text-xs text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors flex-1 min-w-0"
                        />
                        <input
                          type="text"
                          value={building.city || building.cityEn}
                          onChange={(e) => updateBuilding(building.id, { city: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          placeholder={isHe ? "עיר..." : "City..."}
                          className="text-xs text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors w-28"
                        />
                        <input
                          type="text"
                          value={building.entrance}
                          onChange={(e) => updateBuilding(building.id, { entrance: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          placeholder={isHe ? "כניסה..." : "Entrance..."}
                          className="text-xs text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors w-20"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground glass rounded-full px-2.5 py-1">
                        {building.floors.length} floors · {tenantCount} tenants
                      </span>
                      {buildings.length > 1 && (
                        isExpanded
                          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Floors — expandable */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-1">
                    {/* Stacking plan visual */}
                    <div className="flex flex-col gap-[3px]">
                      {sortedFloors.map((floor) => (
                        <div key={floor.id} className="flex items-center gap-2 group">
                          {/* Floor number — editable */}
                          <input
                            type="number"
                            value={floor.floorNumber}
                            onChange={(e) => updateFloor(building.id, floor.id, { floorNumber: parseInt(e.target.value) || 0 })}
                            className="w-8 shrink-0 text-xs text-foreground/70 font-mono font-medium bg-transparent text-center border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors"
                          />

                          {/* Tenant blocks */}
                          <div className="flex flex-1 gap-[2px] min-h-[40px]">
                            {floor.tenants.map((tenant) => {
                              const isEmpty = !tenant.name.trim()
                              const isVacant = tenant.isVacant || isEmpty

                              return (
                                <div
                                  key={tenant.id}
                                  className="flex-1 flex items-center gap-1 group/tenant relative"
                                  style={{
                                    minWidth: '40px',
                                    height: 40,
                                    borderRadius: 8,
                                    ...(isVacant
                                      ? { background: 'rgba(255,255,255,0.03)', border: '1.5px dashed rgba(255,255,255,0.15)' }
                                      : { background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(16,185,129,0.10))', borderInlineStart: '3px solid #10b981' }
                                    ),
                                  }}
                                >
                                  <input
                                    type="text"
                                    value={tenant.name}
                                    onChange={(e) => updateTenant(building.id, floor.id, tenant.id, e.target.value)}
                                    placeholder={isHe ? "שוכר..." : "Tenant..."}
                                    className="w-full h-full bg-transparent px-2 text-xs font-medium focus:outline-none placeholder:text-white/20"
                                    style={{ color: isVacant ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.9)' }}
                                  />
                                  {/* Remove tenant button */}
                                  <button
                                    onClick={() => removeTenant(building.id, floor.id, tenant.id)}
                                    className="absolute -top-1.5 -end-1.5 w-4 h-4 rounded-full bg-background border border-border flex items-center justify-center opacity-0 group-hover/tenant:opacity-100 transition-opacity z-10"
                                  >
                                    <X className="w-2.5 h-2.5 text-muted-foreground" />
                                  </button>
                                </div>
                              )
                            })}

                            {/* Add tenant to this floor */}
                            <button
                              onClick={() => addTenant(building.id, floor.id)}
                              className="w-8 h-[40px] shrink-0 rounded-lg border border-dashed border-border/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:border-primary/30 hover:bg-primary/5"
                            >
                              <Plus className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>

                          {/* Remove floor */}
                          <button
                            onClick={() => removeFloor(building.id, floor.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-full hover:bg-secondary shrink-0"
                          >
                            <Trash2 className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add floor */}
                    <button
                      onClick={() => addFloor(building.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border/30 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      {isHe ? "הוסף קומה" : "Add floor"}
                    </button>

                    {/* Legend */}
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

          {/* Add building */}
          <button
            onClick={addBuilding}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-border/30 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
          >
            <Plus className="w-4 h-4" />
            {isHe ? "הוסף בניין" : "Add building"}
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
  )
}
