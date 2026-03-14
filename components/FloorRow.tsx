"use client"

import { Floor } from "@/types"
import TenantBlock from "./TenantBlock"

interface Props {
  floor: Floor
  selectedBlockId: string | null
  onBlockSelect: (id: string) => void
}

export default function FloorRow({ floor, selectedBlockId, onBlockSelect }: Props) {
  return (
    <div className="flex items-center gap-2.5 group hover:bg-white/[0.015] rounded-lg px-2 py-[2px] transition-colors duration-200">
      <span className="w-7 shrink-0 text-[11px] text-muted-foreground/40 text-left font-mono data-value font-medium">
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
