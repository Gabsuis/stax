"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { Building, Floor } from "@/types"
import FloorRow from "./FloorRow"

interface Props {
  building: Building
  selectedBlockId: string | null
  onBlockSelect: (id: string) => void
}

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.02, delayChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.15, ease: "easeOut" as const } },
}

export default function StackingPlan({ building, selectedBlockId, onBlockSelect }: Props) {
  const t = useTranslations("legend")

  const legend = [
    { color: "#10b981", label: t("over24") },
    { color: "#f59e0b", label: t("6to24") },
    { color: "#f43f5e", label: t("under6") },
    { color: "transparent", border: "1px dashed rgba(255,255,255,0.3)", label: t("vacant"), bright: true },
    { color: "transparent", border: "1px dashed rgba(255,255,255,0.12)", label: t("noData"), dim: true },
  ]

  // Smart floor inference: fill gaps with unknown floors
  const allFloors = useMemo(() => {
    const knownFloors = building.floors
    if (knownFloors.length === 0) return []

    // Build a map of known floors by number
    const floorMap = new Map<number, Floor>()
    let maxFloor = 0
    let minFloor = Infinity

    for (const f of knownFloors) {
      floorMap.set(f.floor, f)
      if (f.floor > maxFloor) maxFloor = f.floor
      if (f.floor < minFloor) minFloor = f.floor
    }

    // Typical floor sqm for unknown floors (use building's or average of known)
    const typicalSqm = building.floorSize ||
      Math.round(knownFloors.reduce((sum, f) => sum + f.totalSqm, 0) / knownFloors.length) || 0

    // Generate full range from 1 (or min) to max
    const startFloor = Math.min(minFloor, 1)
    const result: (Floor & { _unknown?: boolean })[] = []

    for (let i = startFloor; i <= maxFloor; i++) {
      if (floorMap.has(i)) {
        result.push(floorMap.get(i)!)
      } else {
        // Unknown floor placeholder
        result.push({
          floor: i,
          totalSqm: typicalSqm,
          blocks: [],
          _unknown: true,
        } as Floor & { _unknown: boolean })
      }
    }

    return result
  }, [building.floors, building.floorSize])

  return (
    <div className="flex-1 overflow-y-auto px-7 py-5">
      {/* Legend */}
      <div className="flex items-center gap-5 mb-5">
        {legend.map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-[3px]"
              style={{
                backgroundColor: l.color === "transparent" ? "transparent" : l.color,
                border: "border" in l ? l.border : `2px solid ${l.color}`,
              }}
            />
            <span className={`text-xs ${"dim" in l && l.dim ? "text-foreground/30" : "bright" in l && l.bright ? "text-foreground font-medium" : "text-foreground/70"}`}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Floors */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-[3px]"
      >
        {[...allFloors].reverse().map((floor) => (
          <motion.div key={floor.floor} variants={item}>
            <FloorRow
              floor={floor}
              selectedBlockId={selectedBlockId}
              onBlockSelect={onBlockSelect}
              unknown={(floor as Floor & { _unknown?: boolean })._unknown}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
