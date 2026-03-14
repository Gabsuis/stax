"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { Building } from "@/types"
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
    { color: "transparent", border: "1px dashed rgba(255,255,255,0.2)", label: t("vacant") },
  ]

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
            <span className="text-[10px] text-muted-foreground/60">{l.label}</span>
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
        {[...building.floors].reverse().map((floor) => (
          <motion.div key={floor.floor} variants={item}>
            <FloorRow
              floor={floor}
              selectedBlockId={selectedBlockId}
              onBlockSelect={onBlockSelect}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
