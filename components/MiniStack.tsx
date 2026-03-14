"use client"

import { Floor } from "@/types"
import { getLeaseColor } from "@/lib/leaseColors"

export default function MiniStack({ floors }: { floors: Floor[] }) {
  return (
    <div className="flex flex-col-reverse gap-[1px] rounded-lg overflow-hidden" style={{ width: 32, height: 52 }}>
      {floors.map((floor) => {
        const hasVacant = floor.blocks.some(b => b.status === "vacant")
        const earliest = floor.blocks
          .filter(b => b.status === "occupied")
          .sort((a, b) => {
            if (!a.leaseEnd) return 1
            if (!b.leaseEnd) return -1
            return a.leaseEnd.getTime() - b.leaseEnd.getTime()
          })[0]

        const color = hasVacant && !earliest
          ? "rgba(255,255,255,0.06)"
          : hasVacant
            ? "rgba(255,255,255,0.08)"
            : earliest
              ? getLeaseColor(earliest.leaseEnd) + "40"
              : "rgba(255,255,255,0.06)"

        return (
          <div
            key={floor.floor}
            className="w-full transition-all duration-300 group-hover:opacity-90"
            style={{
              height: Math.max(2, Math.round(52 / floors.length) - 1),
              backgroundColor: color,
            }}
          />
        )
      })}
    </div>
  )
}
