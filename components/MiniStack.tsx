"use client"

import { Floor } from "@/types"
import { getLeaseColor } from "@/lib/leaseColors"

export default function MiniStack({ floors }: { floors: Floor[] }) {
  return (
    <div className="flex flex-col-reverse gap-[1px]" style={{ width: 28, height: 56 }}>
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
          ? "rgba(255,255,255,0.1)"
          : hasVacant
            ? "rgba(255,255,255,0.15)"
            : earliest
              ? getLeaseColor(earliest.leaseEnd) + "b3"
              : "rgba(255,255,255,0.1)"

        return (
          <div
            key={floor.floor}
            className="w-full rounded-[1px]"
            style={{
              height: Math.max(2, Math.round(56 / floors.length) - 1),
              backgroundColor: color,
            }}
          />
        )
      })}
    </div>
  )
}
