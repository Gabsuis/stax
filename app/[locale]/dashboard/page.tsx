"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import { buildings } from "@/data/buildings"
import { Building } from "@/types"
import Sidebar from "@/components/Sidebar"
import FilterBar from "@/components/FilterBar"
import BuildingCard from "@/components/BuildingCard"
import BuildingModal from "@/components/BuildingModal"
import DashboardStats from "@/components/DashboardStats"
import { Separator } from "@/components/ui/separator"

export default function DashboardPage() {
  const t = useTranslations("dashboard")
  const [areaFilter, setAreaFilter] = useState("all")
  const [classFilter, setClassFilter] = useState("all")
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)

  const filtered = useMemo(
    () =>
      buildings.filter(
        (b) =>
          b.totalSqm > 0 &&
          (areaFilter === "all" || b.area === areaFilter) &&
          (classFilter === "all" || b.class === classFilter)
      ),
    [areaFilter, classFilter]
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar buildings={buildings} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-base text-muted-foreground mt-1">
              {t("subtitle", { count: filtered.length })}
            </p>
          </div>

          {/* Stats */}
          <DashboardStats buildings={filtered} />

          <Separator />

          {/* Filters */}
          <FilterBar
            areaFilter={areaFilter}
            classFilter={classFilter}
            onAreaChange={setAreaFilter}
            onClassChange={setClassFilter}
          />

          {/* Building cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {filtered.map((b) => (
              <BuildingCard key={b.id} building={b} onSelect={setSelectedBuilding} />
            ))}
          </div>
        </div>
      </main>

      <BuildingModal
        building={selectedBuilding}
        onClose={() => setSelectedBuilding(null)}
      />
    </div>
  )
}
