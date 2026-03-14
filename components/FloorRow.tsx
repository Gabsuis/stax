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
    <div className="flex items-center gap-2 group hover:bg-white/[0.02] rounded-md px-2 py-[2px]">
      <span className="w-8 shrink-0 text-sm text-muted-foreground text-left font-mono tabular-nums font-medium">
        {floor.floor}
      </span>
      <div className="flex flex-1 gap-[3px]">
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
