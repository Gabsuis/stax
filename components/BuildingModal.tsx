"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Building } from "@/types"
import KpiStrip from "./KpiStrip"
import StackingPlan from "./StackingPlan"
import BlockDetail from "./BlockDetail"
import { X, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-background border border-border rounded-xl w-full max-w-[1200px] max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <h2 className="text-xl font-bold truncate">{building.name}</h2>
                    <Badge variant="secondary" className="text-xs shrink-0">{building.class}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground truncate">
                      {building.address}
                      {building.owner !== "—" && ` · ${building.owner}`}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-secondary transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
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
