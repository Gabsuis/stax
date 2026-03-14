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
        "rounded-md text-sm px-4 py-2 font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
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
    { value: "צפון", label: t("north") },
    { value: "מרכז", label: t("center") },
    { value: "דרום", label: t("south") },
  ]

  const classes = [
    { value: "all", label: t("all") },
    { value: "A", label: "A" },
    { value: "A/B", label: "A/B" },
    { value: "B", label: "B" },
    { value: "C", label: "C" },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground w-14 shrink-0">{t("area")}</span>
        <div className="flex gap-1.5">
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
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground w-14 shrink-0">{t("class")}</span>
        <div className="flex gap-1.5">
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
