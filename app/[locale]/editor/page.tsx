"use client"

import { useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import Sidebar from "@/components/Sidebar"
import { buildings as mockBuildings } from "@/data/buildings"
import { Floor, TenantBlock } from "@/types"
import { getLeaseColor, getLeaseLabelParts } from "@/lib/leaseColors"
import { formatSqm } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, Trash2 } from "lucide-react"
import LanguageSwitcher from "@/components/LanguageSwitcher"

function generateId() {
  return Math.random().toString(36).slice(2, 9)
}

export default function EditorPage() {
  const t = useTranslations("editor")
  const tLegend = useTranslations("legend")
  const tLease = useTranslations("lease")
  const locale = useLocale()

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
    { color: "#10b981", label: tLegend("over24") },
    { color: "#f59e0b", label: tLegend("6to24") },
    { color: "#f43f5e", label: tLegend("under6") },
    { color: "transparent", border: "1px dashed rgba(255,255,255,0.2)", label: tLegend("vacant") },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar buildings={mockBuildings} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-7">
            <div>
              <h1 className="text-3xl font-display tracking-tight">{t("title")}</h1>
              <p className="text-sm text-muted-foreground mt-1.5">{t("subtitle")}</p>
            </div>
            <LanguageSwitcher />
          </div>

          <div className="flex gap-6">
            {/* Left: Config */}
            <div className="w-[280px] shrink-0 space-y-4">
              <div className="glass-strong rounded-2xl p-5 space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-[0.15em] block mb-2">{t("buildingName")}</label>
                  <input
                    type="text"
                    value={buildingName}
                    onChange={e => setBuildingName(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-[0.15em] block mb-2">{t("floorSize")}</label>
                  <input
                    type="number"
                    value={floorSize}
                    onChange={e => setFloorSize(Number(e.target.value))}
                    className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all data-value"
                  />
                </div>
                <button
                  onClick={addFloor}
                  className="w-full flex items-center justify-center gap-2 glass rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t("addFloor")}
                </button>
              </div>

              {/* Block editor */}
              {selectedBlock && selectedFloor && (
                <div className="glass-strong rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">{t("editUnit")}</h3>
                    <span className="text-xs text-muted-foreground uppercase tracking-[0.15em] bg-secondary/50 rounded-full px-2.5 py-0.5">{t("floor")} {selectedFloor.floor}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-[0.15em] block mb-2">{t("tenant")}</label>
                    <input
                      type="text"
                      value={selectedBlock.tenantName || ""}
                      onChange={e => updateBlock(selectedBlock.id, { tenantName: e.target.value || null })}
                      placeholder={t("vacantPlaceholder")}
                      className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-[0.15em] block mb-2">{t("areaSqm")}</label>
                    <input
                      type="number"
                      value={selectedBlock.sqm}
                      onChange={e => updateBlock(selectedBlock.id, { sqm: Number(e.target.value) })}
                      className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all data-value"
                    />
                  </div>
                  {selectedBlock.tenantName && (
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-[0.15em] block mb-2">{t("leaseEnd")}</label>
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
                        className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => splitBlock(selectedFloor.floor, selectedBlock.id)}
                      disabled={selectedBlock.sqm < 100}
                      className="flex-1 glass rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-all disabled:opacity-30"
                    >
                      {t("split")}
                    </button>
                    <button
                      onClick={() => removeBlock(selectedFloor.floor, selectedBlock.id)}
                      disabled={selectedFloor.blocks.length <= 1}
                      className="glass rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-lease-red transition-all disabled:opacity-30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Preview */}
            <div className="flex-1">
              <div className="glass-strong rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-primary/30" />
                    <h2 className="text-base font-medium tracking-tight">{buildingName}</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    {legend.map((l) => (
                      <div key={l.label} className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-[3px]"
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
                    <div key={floor.floor} className="flex items-center gap-2.5 group">
                      <span className="w-7 shrink-0 text-xs text-muted-foreground text-start font-mono data-value font-medium">
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
                                className="relative flex items-center justify-center cursor-pointer transition-all duration-200"
                                style={{
                                  width: `${pct}%`,
                                  minWidth: "20px",
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
                                {pct > 18 && (
                                  <span
                                    className="truncate px-2"
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 500,
                                      color: isVacant ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)",
                                    }}
                                  >
                                    {isVacant ? tLegend("vacant") : block.tenantName}
                                  </span>
                                )}
                              </TooltipTrigger>
                              <TooltipContent side="top" className="glass-strong text-sm rounded-lg">
                                <p className="font-medium">{block.tenantName || tLegend("vacant")}</p>
                                <p className="text-muted-foreground text-xs">{formatSqm(block.sqm, locale)} · {tLease(getLeaseLabelParts(block.leaseEnd).key, getLeaseLabelParts(block.leaseEnd).params)}</p>
                              </TooltipContent>
                            </Tooltip>
                          )
                        })}
                      </div>
                      <button
                        onClick={() => removeFloor(floor.floor)}
                        className="opacity-0 group-hover:opacity-100 transition-all duration-200 w-6 h-6 flex items-center justify-center rounded-full hover:bg-secondary"
                      >
                        <Trash2 className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
