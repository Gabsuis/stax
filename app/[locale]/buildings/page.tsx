"use client"

import { useState, useMemo } from "react"
import { useTranslations, useLocale } from "next-intl"
import { buildings } from "@/data/buildings"
import { Building } from "@/types"
import Sidebar from "@/components/Sidebar"
import FilterBar from "@/components/FilterBar"
import BuildingCard from "@/components/BuildingCard"
import BuildingModal from "@/components/BuildingModal"
import { formatSqm, formatPrice } from "@/lib/utils"
import { LayoutGrid, List, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import LanguageSwitcher from "@/components/LanguageSwitcher"

const CITIES = [
  { value: "herzliya", labelEn: "Herzliya Pituach", labelHe: "הרצליה פיתוח", hasData: true },
  { value: "tel-aviv", labelEn: "Tel Aviv", labelHe: "תל אביב", hasData: false },
  { value: "ramat-gan", labelEn: "Ramat Gan", labelHe: "רמת גן", hasData: false },
  { value: "bnei-brak", labelEn: "Bnei Brak", labelHe: "בני ברק", hasData: false },
  { value: "petah-tikva", labelEn: "Petah Tikva", labelHe: "פתח תקווה", hasData: false },
  { value: "netanya", labelEn: "Netanya", labelHe: "נתניה", hasData: false },
]

export default function BuildingsPage() {
  const t = useTranslations("buildingsPage")
  const locale = useLocale()
  const [areaFilter, setAreaFilter] = useState("all")
  const [classFilter, setClassFilter] = useState("all")
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)
  const [view, setView] = useState<"table" | "cards">("table")
  const [city, setCity] = useState("herzliya")
  const [cityOpen, setCityOpen] = useState(false)

  const selectedCity = CITIES.find((c) => c.value === city)!
  const cityLabel = locale === "he" ? selectedCity.labelHe : selectedCity.labelEn

  const filtered = useMemo(
    () =>
      buildings.filter(
        (b) =>
          b.totalSqm > 0 &&
          (areaFilter === "all" || b.area === areaFilter) &&
          (classFilter === "all" || b.class === classFilter)
      ).filter(() => selectedCity.hasData),
    [areaFilter, classFilter, selectedCity]
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar buildings={buildings} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-7">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display tracking-tight">{t("title")}</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="relative">
                  <button
                    onClick={() => setCityOpen(!cityOpen)}
                    className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {cityLabel}
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", cityOpen && "rotate-180")} />
                  </button>
                  {cityOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setCityOpen(false)} />
                      <div className="absolute top-full start-0 mt-1 z-50 glass-strong rounded-xl py-1.5 min-w-[200px] shadow-2xl shadow-black/40">
                        {CITIES.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => { setCity(c.value); setCityOpen(false) }}
                            className={cn(
                              "w-full text-start px-4 py-2 text-sm transition-colors",
                              city === c.value
                                ? "text-primary font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                            )}
                          >
                            {locale === "he" ? c.labelHe : c.labelEn}
                            {!c.hasData && <span className="text-xs text-muted-foreground/50 ms-2">—</span>}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">· {filtered.length} {t("colName").toLowerCase()}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {/* View toggle */}
            <div className="flex items-center gap-1 glass rounded-full p-1">
              <button
                onClick={() => setView("table")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all",
                  view === "table"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="w-3.5 h-3.5" />
                {t("tableView")}
              </button>
              <button
                onClick={() => setView("cards")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all",
                  view === "cards"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                {t("cardView")}
              </button>
            </div>
            </div>
          </div>

          {/* Filters */}
          <FilterBar
            areaFilter={areaFilter}
            classFilter={classFilter}
            onAreaChange={setAreaFilter}
            onClassChange={setClassFilter}
          />

          {/* Table View */}
          {view === "table" && (
            <div className="glass-strong rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-start text-xs text-muted-foreground uppercase tracking-[0.15em] font-medium px-5 py-4">{t("colName")}</th>
                    <th className="text-start text-xs text-muted-foreground uppercase tracking-[0.15em] font-medium px-4 py-4">{t("colClass")}</th>
                    <th className="text-start text-xs text-muted-foreground uppercase tracking-[0.15em] font-medium px-4 py-4">{t("colArea")}</th>
                    <th className="text-end text-xs text-muted-foreground uppercase tracking-[0.15em] font-medium px-4 py-4">{t("colTotalSqm")}</th>
                    <th className="text-end text-xs text-muted-foreground uppercase tracking-[0.15em] font-medium px-4 py-4">{t("colVacantSqm")}</th>
                    <th className="text-end text-xs text-muted-foreground uppercase tracking-[0.15em] font-medium px-4 py-4">{t("colOccupancy")}</th>
                    <th className="text-end text-xs text-muted-foreground uppercase tracking-[0.15em] font-medium px-4 py-4">{t("colPrice")}</th>
                    <th className="text-end text-xs text-muted-foreground uppercase tracking-[0.15em] font-medium px-5 py-4">{t("colFloors")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => {
                    const occ = Math.round(b.occupancy * 100)
                    return (
                      <tr
                        key={b.id}
                        onClick={() => setSelectedBuilding(b)}
                        className="border-b border-border/50 cursor-pointer hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div className="font-medium text-sm">{locale === "he" ? b.name : b.nameEn}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{locale === "he" ? b.nameEn : b.name}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs uppercase tracking-[0.1em] bg-secondary/50 rounded-full px-2.5 py-1">{b.class}</span>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">{b.area || "—"}</td>
                        <td className="px-4 py-4 text-end text-sm font-medium data-value">{formatSqm(b.totalSqm, locale)}</td>
                        <td className="px-4 py-4 text-end text-sm font-medium data-value text-lease-red">{formatSqm(b.vacantSqm, locale)}</td>
                        <td className="px-4 py-4 text-end">
                          <span className={cn(
                            "text-sm font-medium data-value",
                            occ >= 85 ? "text-lease-green" : occ >= 65 ? "" : "text-lease-red"
                          )}>
                            {occ}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-end text-sm data-value">{formatPrice(b.askingPrice, locale)}</td>
                        <td className="px-5 py-4 text-end text-sm data-value">{b.floorCount}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Card View */}
          {view === "cards" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              {filtered.map((b) => (
                <BuildingCard key={b.id} building={b} onSelect={setSelectedBuilding} />
              ))}
            </div>
          )}
        </div>
      </main>

      <BuildingModal
        building={selectedBuilding}
        onClose={() => setSelectedBuilding(null)}
      />
    </div>
  )
}
