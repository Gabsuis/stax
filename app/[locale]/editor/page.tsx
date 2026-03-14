"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import Sidebar from "@/components/Sidebar"
import { buildings as mockBuildings } from "@/data/buildings"
import { Floor, TenantBlock } from "@/types"
import { getLeaseColor, getLeaseLabel } from "@/lib/leaseColors"
import { formatSqm } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, Trash2, Building2 } from "lucide-react"

function generateId() {
  return Math.random().toString(36).slice(2, 9)
}

export default function EditorPage() {
  const t = useTranslations("editor")
  const tLegend = useTranslations("legend")

  const [buildingName, setBuildingName] = useState(t("newBuilding"))
  const [floorSize, setFloorSize] = useState(1200)
  const [floors, setFloors] = useState<Floor[]>([
    { floor: 1, totalSqm: 1200, blocks: [{ id: generateId(), tenantName: null, sqm: 1200, status: "vacant", leaseEnd: null }] },
    { floor: 2, totalSqm: 1200, blocks: [{ id: generateId(), tenantName: null, sqm: 1200, status: "vacant", leaseEnd: null }] },
    { floor: 3, totalSqm: 1200, blocks: [{ id: generateId(), tenantName: null, sqm: 1200, status: "vacant", leaseEnd: null }] },
  ])
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)

  const selectedBlock = floors.flatMap(f => f.blocks).find(b => b.id === selectedBlockId) ?? null
  const selectedFloor = floors.find(f => f.blocks.some(b => b.id === selectedBlockId)) ?? null

  const addFloor = () => {
    const newFloorNum = floors.length + 1
    setFloors([...floors, {
      floor: newFloorNum,
      totalSqm: floorSize,
      blocks: [{ id: generateId(), tenantName: null, sqm: floorSize, status: "vacant", leaseEnd: null }],
    }])
  }

  const removeFloor = (floorNum: number) => {
    if (floors.length <= 1) return
    setFloors(floors.filter(f => f.floor !== floorNum).map((f, i) => ({ ...f, floor: i + 1 })))
  }

  const splitBlock = (floorNum: number, blockId: string) => {
    setFloors(floors.map(f => {
      if (f.floor !== floorNum) return f
      const blockIndex = f.blocks.findIndex(b => b.id === blockId)
      if (blockIndex === -1) return f
      const block = f.blocks[blockIndex]
      const halfSqm = Math.round(block.sqm / 2)
      const newBlocks = [...f.blocks]
      newBlocks.splice(blockIndex, 1,
        { ...block, sqm: halfSqm },
        { id: generateId(), tenantName: null, sqm: block.sqm - halfSqm, status: "vacant", leaseEnd: null }
      )
      return { ...f, blocks: newBlocks }
    }))
  }

  const updateBlock = (blockId: string, updates: Partial<TenantBlock>) => {
    setFloors(floors.map(f => ({
      ...f,
      blocks: f.blocks.map(b => {
        if (b.id !== blockId) return b
        const updated = { ...b, ...updates }
        if (updates.tenantName !== undefined) {
          updated.status = updates.tenantName ? "occupied" : "vacant"
          if (!updates.tenantName) updated.leaseEnd = null
        }
        return updated
      })
    })))
  }

  const removeBlock = (floorNum: number, blockId: string) => {
    setFloors(floors.map(f => {
      if (f.floor !== floorNum) return f
      if (f.blocks.length <= 1) return f
      const block = f.blocks.find(b => b.id === blockId)
      if (!block) return f
      const remaining = f.blocks.filter(b => b.id !== blockId)
      remaining[remaining.length - 1] = {
        ...remaining[remaining.length - 1],
        sqm: remaining[remaining.length - 1].sqm + block.sqm,
      }
      return { ...f, blocks: remaining }
    }))
    if (selectedBlockId === blockId) setSelectedBlockId(null)
  }

  const legend = [
    { color: "#16a34a", label: tLegend("over24") },
    { color: "#d97706", label: tLegend("6to24") },
    { color: "#dc2626", label: tLegend("under6") },
    { color: "transparent", border: "1px dashed rgba(255,255,255,0.3)", label: tLegend("vacant") },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar buildings={mockBuildings} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-base text-muted-foreground mt-1">{t("subtitle")}</p>
          </div>

          <div className="flex gap-6">
            {/* Left: Config */}
            <div className="w-[280px] shrink-0 space-y-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">{t("buildingName")}</label>
                    <input
                      type="text"
                      value={buildingName}
                      onChange={e => setBuildingName(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">{t("floorSize")}</label>
                    <input
                      type="number"
                      value={floorSize}
                      onChange={e => setFloorSize(Number(e.target.value))}
                      className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <Button onClick={addFloor} variant="secondary" className="w-full" size="sm">
                    <Plus className="w-3.5 h-3.5 me-1.5" />
                    {t("addFloor")}
                  </Button>
                </CardContent>
              </Card>

              {/* Block editor */}
              {selectedBlock && selectedFloor && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">{t("editUnit")}</h3>
                      <Badge variant="secondary" className="text-xs">{t("floor")} {selectedFloor.floor}</Badge>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">{t("tenant")}</label>
                      <input
                        type="text"
                        value={selectedBlock.tenantName || ""}
                        onChange={e => updateBlock(selectedBlock.id, { tenantName: e.target.value || null })}
                        placeholder={t("vacantPlaceholder")}
                        className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">{t("areaSqm")}</label>
                      <input
                        type="number"
                        value={selectedBlock.sqm}
                        onChange={e => updateBlock(selectedBlock.id, { sqm: Number(e.target.value) })}
                        className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    {selectedBlock.tenantName && (
                      <div>
                        <label className="text-sm text-muted-foreground block mb-1">{t("leaseEnd")}</label>
                        <input
                          type="month"
                          value={selectedBlock.leaseEnd ? `${selectedBlock.leaseEnd.getFullYear()}-${String(selectedBlock.leaseEnd.getMonth() + 1).padStart(2, '0')}` : ""}
                          onChange={e => {
                            if (e.target.value) {
                              const [y, m] = e.target.value.split("-")
                              updateBlock(selectedBlock.id, { leaseEnd: new Date(Number(y), Number(m) - 1, 1) })
                            } else {
                              updateBlock(selectedBlock.id, { leaseEnd: null })
                            }
                          }}
                          className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => splitBlock(selectedFloor.floor, selectedBlock.id)}
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        disabled={selectedBlock.sqm < 100}
                      >
                        {t("split")}
                      </Button>
                      <Button
                        onClick={() => removeBlock(selectedFloor.floor, selectedBlock.id)}
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        disabled={selectedFloor.blocks.length <= 1}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Preview */}
            <div className="flex-1">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <h2 className="text-base font-semibold">{buildingName}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                      {legend.map((l) => (
                        <div key={l.label} className="flex items-center gap-1.5">
                          <div
                            className="w-3 h-3 rounded-[3px]"
                            style={{
                              backgroundColor: l.color === "transparent" ? "transparent" : l.color,
                              border: "border" in l ? l.border : `2px solid ${l.color}`,
                            }}
                          />
                          <span className="text-xs text-muted-foreground">{l.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-[3px]">
                    {[...floors].reverse().map((floor) => (
                      <div key={floor.floor} className="flex items-center gap-2 group">
                        <span className="w-8 shrink-0 text-sm text-muted-foreground text-start font-mono tabular-nums font-medium">
                          {floor.floor}
                        </span>
                        <div className="flex flex-1 gap-[2px]">
                          {floor.blocks.map((block) => {
                            const pct = (block.sqm / floor.totalSqm) * 100
                            const isVacant = block.status === "vacant"
                            const color = getLeaseColor(block.leaseEnd)
                            const isSelected = block.id === selectedBlockId

                            return (
                              <Tooltip key={block.id}>
                                <TooltipTrigger
                                  onClick={() => setSelectedBlockId(block.id)}
                                  className="relative flex items-center justify-center cursor-pointer transition-all duration-150 hover:brightness-125"
                                  style={{
                                    width: `${pct}%`,
                                    minWidth: "20px",
                                    height: 44,
                                    borderRadius: 6,
                                    ...(isVacant
                                      ? {
                                          background: "rgba(255,255,255,0.04)",
                                          border: "1.5px dashed rgba(255,255,255,0.18)",
                                        }
                                      : {
                                          background: color + "1a",
                                          borderInlineStart: `3px solid ${color}`,
                                        }),
                                    ...(isSelected
                                      ? {
                                          outline: "2px solid rgba(255,255,255,0.4)",
                                          outlineOffset: -1,
                                        }
                                      : {}),
                                  }}
                                >
                                  {pct > 18 && (
                                    <span
                                      className="truncate px-2"
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: isVacant ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.7)",
                                      }}
                                    >
                                      {isVacant ? tLegend("vacant") : block.tenantName}
                                    </span>
                                  )}
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-sm">
                                  <p className="font-medium">{block.tenantName || tLegend("vacant")}</p>
                                  <p className="text-muted-foreground">{formatSqm(block.sqm)} · {getLeaseLabel(block.leaseEnd)}</p>
                                </TooltipContent>
                              </Tooltip>
                            )
                          })}
                        </div>
                        <button
                          onClick={() => removeFloor(floor.floor)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded hover:bg-secondary"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
