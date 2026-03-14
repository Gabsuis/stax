"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Building } from "@/types"
import KpiStrip from "./KpiStrip"
import StackingPlan from "./StackingPlan"
import BlockDetail from "./BlockDetail"
import { X, MapPin } from "lucide-react"

interface Props {
  building: Building | null
  onClose: () => void
}

export default function BuildingModal({ building, onClose }: Props) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)

  useEffect(() => {
    setSelectedBlockId(null)
  }, [building])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (building) {
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
      return () => {
        document.removeEventListener("keydown", handleKeyDown)
        document.body.style.overflow = ""
      }
    }
  }, [building, handleKeyDown])

  const selectedBlock = building
    ? building.floors
        .flatMap((f) => f.blocks)
        .find((b) => b.id === selectedBlockId) ?? null
    : null

  return (
    <AnimatePresence>
      {building && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          onClick={onClose}
        >
          {/* Backdrop */}
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
            <div className="flex items-center justify-between px-7 py-5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-display tracking-tight truncate">{building.name}</h2>
                    <span className="text-xs text-muted-foreground uppercase tracking-[0.15em] bg-secondary/50 rounded-full px-2.5 py-0.5 shrink-0">{building.class}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">
                      {building.address}
                      {building.owner !== "—" && ` · ${building.owner}`}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full glass hover:bg-white/[0.06] transition-all duration-300 shrink-0"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* KPI Strip */}
            <KpiStrip building={building} />

            {/* Body */}
            <div className="flex flex-1 overflow-hidden min-h-0">
              <StackingPlan
                building={building}
                selectedBlockId={selectedBlockId}
                onBlockSelect={setSelectedBlockId}
              />
              <BlockDetail block={selectedBlock} building={building} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
