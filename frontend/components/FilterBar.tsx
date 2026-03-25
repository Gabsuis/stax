"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

interface Props {
  areaFilter: string
  classFilter: string
  onAreaChange: (v: string) => void
  onClassChange: (v: string) => void
}

function Pill({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full text-xs px-4 py-2 font-medium transition-all duration-300",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "glass text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  )
}

export default function FilterBar({ areaFilter, classFilter, onAreaChange, onClassChange }: Props) {
  const t = useTranslations("filters")

  const areas = [
    { value: "all", label: t("all") },
    { value: "north", label: t("north") },
    { value: "center", label: t("center") },
    { value: "south", label: t("south") },
  ]

  const classes = [
    { value: "all", label: t("all") },
    { value: "A", label: "A" },
    { value: "A/B", label: "A/B" },
    { value: "B", label: "B" },
    { value: "C", label: "C" },
  ]

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="flex items-center gap-2.5">
        <span className="text-xs text-muted-foreground uppercase tracking-[0.15em]">{t("area")}</span>
        <div className="flex gap-1">
          {areas.map((a) => (
            <Pill
              key={a.value}
              label={a.label}
              active={areaFilter === a.value}
              onClick={() => onAreaChange(a.value)}
            />
          ))}
        </div>
      </div>
      <div className="w-px h-6 bg-border" />
      <div className="flex items-center gap-2.5">
        <span className="text-xs text-muted-foreground uppercase tracking-[0.15em]">{t("class")}</span>
        <div className="flex gap-1">
          {classes.map((c) => (
            <Pill
              key={c.value}
              label={c.label}
              active={classFilter === c.value}
              onClick={() => onClassChange(c.value)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
