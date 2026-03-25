"use client"

import { Floor } from "@/types"
import TenantBlock from "./TenantBlock"

interface Props {
  floor: Floor
  selectedBlockId: string | null
  onBlockSelect: (id: string) => void
  unknown?: boolean
}

export default function FloorRow({ floor, selectedBlockId, onBlockSelect, unknown }: Props) {
  if (unknown) {
    return (
      <div className="flex items-center gap-2.5 px-2 py-[1px]">
        <span className="w-7 shrink-0 text-[10px] text-foreground/25 text-left font-mono font-medium">
          {floor.floor}
        </span>
        <div
          className="flex-1 flex items-center justify-center"
          style={{
            height: 20,
            borderRadius: 4,
            border: "1px dashed rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.015)",
          }}
        >
          <span className="text-[9px] text-foreground/15 tracking-wider">No data</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2.5 group hover:bg-white/[0.015] rounded-lg px-2 py-[2px] transition-colors duration-200">
      <span className="w-7 shrink-0 text-xs text-foreground/70 text-left font-mono data-value font-medium">
        {floor.floor}
      </span>
      <div className="flex flex-1 gap-[2px]">
        {floor.blocks.map((block) => (
          <TenantBlock
            key={block.id}
            block={block}
            floorTotalSqm={floor.totalSqm}
            isSelected={block.id === selectedBlockId}
            onSelect={onBlockSelect}
          />
        ))}
      </div>
    </div>
  )
}
