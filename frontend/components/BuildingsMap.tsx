"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Building } from "@/types"
import { formatSqm, formatPrice, cn } from "@/lib/utils"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

// Herzliya Pituach center
const DEFAULT_CENTER: [number, number] = [34.8095, 32.1630]
const DEFAULT_ZOOM = 14.2

// Fallback coordinates when DB doesn't have lat/lng yet
const COORDS_FALLBACK: Record<string, [number, number]> = {
  "מגדל אמפא":           [34.8120, 32.1636],
  "הרצליה ביזנס פארק":    [34.8099, 32.1667],
  "גב ים צפון":           [34.8130, 32.1668],
  "בית אקרשטיין הישן":    [34.8133, 32.1660],
  "משכית 25":             [34.8112, 32.1639],
  "קוגנייט":              [34.8108, 32.1621],
  "גלגלי הפלדה 11":       [34.8079, 32.1640],
  "תאומי שדרות הגלים":    [34.8089, 32.1612],
  "מרכז גב ים שנקר":      [34.8094, 32.1597],
  "בית אמצור":            [34.8059, 32.1615],
  "מגדלי אקרשטיין C":     [34.8086, 32.1614],
  "מגדלי אקרשטיין A":     [34.8080, 32.1608],
  "בית גראפ":             [34.8093, 32.1606],
  "רוגובין ריט 1":         [34.8080, 32.1598],
  "בית תאטראות":           [34.8112, 32.1659],
  "בית שער העיר":          [34.8100, 32.1604],
  "HQ":                    [34.8095, 32.1625],
}

function getCoords(b: Building): [number, number] | null {
  if (b.longitude && b.latitude) return [b.longitude, b.latitude]
  return COORDS_FALLBACK[b.name] ?? null
}

function getOccupancyColor(occupancy: number): string {
  const occ = Math.round(occupancy * 100)
  if (occ >= 85) return "#10b981" // green
  if (occ >= 65) return "#f59e0b" // amber
  return "#f43f5e" // red
}

function getClassBg(cls: string): string {
  switch (cls) {
    case "A+": return "bg-violet-500/10 text-violet-700 dark:text-violet-300"
    case "A": return "bg-blue-500/10 text-blue-700 dark:text-blue-300"
    case "A/B": return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
    case "B": return "bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "C": return "bg-stone-500/10 text-stone-700 dark:text-stone-300"
    default: return "bg-secondary text-muted-foreground"
  }
}

interface Props {
  buildings: Building[]
  onSelect: (b: Building) => void
}

export default function BuildingsMap({ buildings, onSelect }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const locale = useLocale()
  const t = useTranslations("card")
  const tF = useTranslations("filters")
  const [mapReady, setMapReady] = useState(false)

  const MAP_STYLE: maplibregl.StyleSpecification = {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      },
    },
    layers: [{ id: "osm-tiles", type: "raster", source: "osm" }],
  }

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    })

    m.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), "bottom-right")
    m.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left")

    m.on("load", () => {
      setMapReady(true)
      // Force resize to fill container
      setTimeout(() => m.resize(), 100)
    })
    map.current = m

    return () => {
      m.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  // Create popup HTML
  const createPopupContent = useCallback((b: Building) => {
    const occ = Math.round(b.occupancy * 100)
    const occColor = occ >= 85 ? "#10b981" : occ >= 65 ? "#f59e0b" : "#f43f5e"
    const name = locale === "he" ? b.name : (b.nameEn || b.name)
    const subName = locale === "he" ? (b.nameEn || "") : b.name
    const areaLabel = b.area ? tF(b.area) : ""

    return `
      <div style="min-width:220px;max-width:280px;font-family:var(--font-sans),system-ui,sans-serif;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
          <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;padding:2px 8px;border-radius:999px;background:rgba(0,0,0,0.06);">${b.class}</span>
          ${areaLabel ? `<span style="font-size:10px;color:#888;">${areaLabel}</span>` : ""}
        </div>
        <div style="font-size:14px;font-weight:600;margin-bottom:2px;">${name}</div>
        ${subName ? `<div style="font-size:11px;color:#888;margin-bottom:10px;">${subName}</div>` : ""}
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px;">
          <div>
            <div style="font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;">${b.totalSqm ? formatSqm(b.totalSqm, locale) : "—"}</div>
            <div style="font-size:10px;color:#888;">Total</div>
          </div>
          <div>
            <div style="font-size:13px;font-weight:600;color:#f43f5e;font-variant-numeric:tabular-nums;">${b.vacantSqm ? formatSqm(b.vacantSqm, locale) : "—"}</div>
            <div style="font-size:10px;color:#888;">Vacant</div>
          </div>
          <div>
            <div style="font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;">${b.askingPrice ? formatPrice(b.askingPrice, locale) : "—"}</div>
            <div style="font-size:10px;color:#888;">₪/sqm</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
          <div style="flex:1;height:4px;border-radius:999px;background:rgba(0,0,0,0.08);overflow:hidden;">
            <div style="height:100%;width:${occ}%;background:${occColor};border-radius:999px;"></div>
          </div>
          <span style="font-size:11px;font-weight:600;color:${occColor};font-variant-numeric:tabular-nums;">${occ}%</span>
        </div>
        <button
          data-building-id="${b.id}"
          style="width:100%;padding:6px 0;font-size:11px;font-weight:500;border:1px solid rgba(0,0,0,0.12);border-radius:8px;background:transparent;cursor:pointer;transition:background 0.15s;"
          onmouseover="this.style.background='rgba(0,0,0,0.04)'"
          onmouseout="this.style.background='transparent'"
        >
          ${locale === "he" ? "פתח מגדל" : "View Building"} →
        </button>
      </div>
    `
  }, [locale, tF])

  // Render markers
  useEffect(() => {
    if (!map.current || !mapReady) return

    // Clean existing markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const withCoords = buildings.map((b) => ({ b, coords: getCoords(b) })).filter((x): x is { b: Building; coords: [number, number] } => x.coords !== null)

    withCoords.forEach(({ b, coords }) => {
      const occ = Math.round(b.occupancy * 100)
      const color = getOccupancyColor(b.occupancy)
      const size = Math.max(28, Math.min(48, 20 + (b.totalSqm / 5000)))

      // Wrapper — MapLibre controls transform on this, so we don't touch it
      const el = document.createElement("div")
      el.className = "building-marker"
      el.style.cssText = `cursor: pointer; z-index: ${occ < 65 ? 30 : occ < 85 ? 20 : 10};`

      // Visual circle — we animate THIS, not the outer wrapper
      const circle = document.createElement("div")
      circle.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid white;
        box-shadow: 0 2px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s;
      `

      // Inner text
      const inner = document.createElement("span")
      inner.style.cssText = `
        font-size: 9px;
        font-weight: 700;
        color: white;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        font-variant-numeric: tabular-nums;
      `
      inner.textContent = `${occ}%`
      circle.appendChild(inner)
      el.appendChild(circle)

      el.addEventListener("mouseenter", () => {
        circle.style.transform = "scale(1.25)"
        circle.style.boxShadow = "0 4px 20px rgba(0,0,0,0.35), 0 0 0 2px rgba(255,255,255,0.5)"
        el.style.zIndex = "100"
      })
      el.addEventListener("mouseleave", () => {
        circle.style.transform = "scale(1)"
        circle.style.boxShadow = "0 2px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)"
        el.style.zIndex = String(occ < 65 ? 30 : occ < 85 ? 20 : 10)
      })

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat(coords)
        .addTo(map.current!)

      // Click → popup
      el.addEventListener("click", (e) => {
        e.stopPropagation()

        if (popupRef.current) popupRef.current.remove()

        const popup = new maplibregl.Popup({
          offset: [0, -(size / 2 + 8)],
          closeButton: true,
          closeOnClick: true,
          maxWidth: "300px",
          className: "stax-popup",
        })
          .setLngLat(coords)
          .setHTML(createPopupContent(b))
          .addTo(map.current!)

        popupRef.current = popup

        // Listen for "View Building" click inside popup
        setTimeout(() => {
          const btn = document.querySelector(`button[data-building-id="${b.id}"]`)
          if (btn) {
            btn.addEventListener("click", () => {
              popup.remove()
              onSelect(b)
            })
          }
        }, 50)

        // Fly to building
        map.current!.flyTo({
          center: coords,
          zoom: Math.max(map.current!.getZoom(), 15.5),
          duration: 800,
        })
      })

      markersRef.current.push(marker)
    })

    // Fit bounds to show all buildings
    if (withCoords.length > 1) {
      const bounds = new maplibregl.LngLatBounds()
      withCoords.forEach(({ coords }) => bounds.extend(coords))
      map.current.fitBounds(bounds, { padding: 80, maxZoom: 15.5, duration: 0 })
    }
  }, [buildings, mapReady, createPopupContent, onSelect])

  return (
    <div className="relative w-full glass-strong rounded-2xl overflow-hidden" style={{ height: "calc(100vh - 280px)", minHeight: 500 }}>
      <div ref={mapContainer} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }} />

      {/* Legend overlay */}
      <div className="absolute top-4 start-4 glass rounded-xl p-3 space-y-1.5 z-10">
        <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2">
          {locale === "he" ? "תפוסה" : "Occupancy"}
        </div>
        {[
          { color: "#10b981", label: locale === "he" ? "85%+" : "85%+" },
          { color: "#f59e0b", label: locale === "he" ? "65-85%" : "65-85%" },
          { color: "#f43f5e", label: locale === "he" ? "<65%" : "<65%" },
        ].map(({ color, label }) => (
          <div key={color} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: color, border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }}
            />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Building count */}
      <div className="absolute top-4 end-14 glass rounded-lg px-3 py-1.5 z-10">
        <span className="text-xs font-medium">
          {buildings.filter((b) => getCoords(b) !== null).length}
          <span className="text-muted-foreground ml-1">
            {locale === "he" ? "מגדלים" : "buildings"}
          </span>
        </span>
      </div>
    </div>
  )
}
