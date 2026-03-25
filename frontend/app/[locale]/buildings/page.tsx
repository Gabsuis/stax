"use client"

import { useState, useMemo } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useBuildings } from "@/lib/hooks/useBuildings"
import { useCities } from "@/lib/hooks/useCities"
import { Building } from "@/types"
import Sidebar from "@/components/Sidebar"
import FilterBar from "@/components/FilterBar"
import BuildingCard from "@/components/BuildingCard"
import BuildingModal from "@/components/BuildingModal"
import { formatSqm, formatPrice } from "@/lib/utils"
import { LayoutGrid, List, ChevronDown, Search, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import ThemeToggle from "@/components/ThemeToggle"
import { BuildingsTableSkeleton, BuildingsCardsSkeleton } from "@/components/LoadingSkeleton"

type SortKey = "name" | "class" | "totalSqm" | "vacantSqm" | "occupancy" | "askingPrice" | "floorCount"
type SortDir = "asc" | "desc"

export default function BuildingsPage() {
  const t = useTranslations("buildingsPage")
  const locale = useLocale()
  const { buildings, loading } = useBuildings()
  const { cities } = useCities()
  const [areaFilter, setAreaFilter] = useState("all")
  const [classFilter, setClassFilter] = useState("all")
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)
  const [view, setView] = useState<"table" | "cards">("table")
  const [city, setCity] = useState("all")
  const [cityOpen, setCityOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const selectedCity = cities.find((c) => c.city === city)
  const cityLabel = city === "all"
    ? (locale === "he" ? "כל הערים" : "All Cities")
    : (locale === "he" ? (selectedCity?.city ?? city) : (selectedCity?.city_en ?? city))

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase()
    const result = buildings.filter(
      (b) =>
        (city === "all" || b.city === city) &&
        (areaFilter === "all" || b.area === areaFilter) &&
        (classFilter === "all" || b.class === classFilter) &&
        (!search || b.name.toLowerCase().includes(searchLower) ||
         b.nameEn.toLowerCase().includes(searchLower) ||
         b.address.toLowerCase().includes(searchLower))
    )

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name, "he"); break
        case "class": cmp = a.class.localeCompare(b.class); break
        case "totalSqm": cmp = a.totalSqm - b.totalSqm; break
        case "vacantSqm": cmp = a.vacantSqm - b.vacantSqm; break
        case "occupancy": cmp = a.occupancy - b.occupancy; break
        case "askingPrice": cmp = a.askingPrice - b.askingPrice; break
        case "floorCount": cmp = a.floorCount - b.floorCount; break
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    return result
  }, [buildings, city, areaFilter, classFilter, search, sortKey, sortDir])

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
                        <button
                          key="all"
                          onClick={() => { setCity("all"); setCityOpen(false) }}
                          className={cn(
                            "w-full text-start px-4 py-2 text-sm transition-colors",
                            city === "all"
                              ? "text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
                          )}
                        >
                          {locale === "he" ? "כל הערים" : "All Cities"}
                        </button>
                        {cities.map((c) => (
                          <button
                            key={c.city}
                            onClick={() => { setCity(c.city); setCityOpen(false) }}
                            className={cn(
                              "w-full text-start px-4 py-2 text-sm transition-colors",
                              city === c.city
                                ? "text-primary font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
                            )}
                          >
                            {locale === "he" ? c.city : (c.city_en || c.city)}
                            <span className="text-xs text-muted-foreground/50 ms-2">{c.count}</span>
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
            <ThemeToggle />
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

          {/* Search + Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={locale === "he" ? "חפש בניין..." : "Search buildings..."}
                className="w-full ps-10 pe-4 py-2 text-sm bg-transparent glass rounded-full border-none focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/40"
              />
            </div>
            <FilterBar
              areaFilter={areaFilter}
              classFilter={classFilter}
            onAreaChange={setAreaFilter}
            onClassChange={setClassFilter}
            />
          </div>

          {/* Loading */}
          {loading && view === "table" && <BuildingsTableSkeleton />}
          {loading && view === "cards" && <BuildingsCardsSkeleton />}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="glass-strong rounded-2xl p-12 text-center">
              <p className="text-muted-foreground">{search ? (locale === "he" ? "לא נמצאו תוצאות" : "No results found") : (locale === "he" ? "אין בניינים בקטגוריה זו" : "No buildings in this category")}</p>
            </div>
          )}

          {/* Table View */}
          {!loading && view === "table" && filtered.length > 0 && (
            <div className="glass-strong rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {([
                      { key: "name" as SortKey, label: t("colName"), align: "text-start", px: "px-5" },
                      { key: "class" as SortKey, label: t("colClass"), align: "text-start", px: "px-4" },
                      { key: null, label: t("colArea"), align: "text-start", px: "px-4" },
                      { key: "totalSqm" as SortKey, label: t("colTotalSqm"), align: "text-end", px: "px-4" },
                      { key: "vacantSqm" as SortKey, label: t("colVacantSqm"), align: "text-end", px: "px-4" },
                      { key: "occupancy" as SortKey, label: t("colOccupancy"), align: "text-end", px: "px-4" },
                      { key: "askingPrice" as SortKey, label: t("colPrice"), align: "text-end", px: "px-4" },
                      { key: "floorCount" as SortKey, label: t("colFloors"), align: "text-end", px: "px-5" },
                    ] as const).map((col, i) => (
                      <th
                        key={i}
                        onClick={col.key ? () => toggleSort(col.key!) : undefined}
                        className={cn(
                          `${col.align} text-xs text-muted-foreground uppercase tracking-[0.15em] font-medium ${col.px} py-4`,
                          col.key && "cursor-pointer hover:text-foreground transition-colors select-none"
                        )}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {col.key && sortKey === col.key && (
                            <ArrowUpDown className="w-3 h-3" />
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => {
                    const occ = Math.round(b.occupancy * 100)
                    return (
                      <tr
                        key={b.id}
                        onClick={() => setSelectedBuilding(b)}
                        className="border-b border-border/50 cursor-pointer hover:bg-foreground/[0.03] transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div className="font-medium text-sm">{locale === "he" ? b.name : b.nameEn}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{locale === "he" ? b.nameEn : b.name}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs uppercase tracking-[0.1em] bg-secondary/50 rounded-full px-2.5 py-1">{b.class}</span>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">{b.area || "—"}</td>
                        <td className="px-4 py-4 text-end text-sm font-medium data-value">{b.totalSqm ? formatSqm(b.totalSqm, locale) : <span className="text-muted-foreground/40">—</span>}</td>
                        <td className="px-4 py-4 text-end text-sm font-medium data-value text-lease-red">{b.vacantSqm ? formatSqm(b.vacantSqm, locale) : <span className="text-muted-foreground/40">—</span>}</td>
                        <td className="px-4 py-4 text-end">
                          {occ > 0 ? (
                            <span className={cn(
                              "text-sm font-medium data-value",
                              occ >= 85 ? "text-lease-green" : occ >= 65 ? "" : "text-lease-red"
                            )}>
                              {occ}%
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-end text-sm data-value">{b.askingPrice ? formatPrice(b.askingPrice, locale) : <span className="text-muted-foreground/40">—</span>}</td>
                        <td className="px-5 py-4 text-end text-sm data-value">{b.floorCount || <span className="text-muted-foreground/40">—</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Card View */}
          {!loading && view === "cards" && filtered.length > 0 && (
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
