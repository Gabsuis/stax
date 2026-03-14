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
  hidden: { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.12 } },
}

export default function StackingPlan({ building, selectedBlockId, onBlockSelect }: Props) {
  const t = useTranslations("legend")

  const legend = [
    { color: "#16a34a", label: t("over24") },
    { color: "#d97706", label: t("6to24") },
    { color: "#dc2626", label: t("under6") },
    { color: "transparent", border: "1px dashed rgba(255,255,255,0.3)", label: t("vacant") },
  ]

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-5">
        {legend.map((l) => (
          <div key={l.label} className="flex items-center gap-2">
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
