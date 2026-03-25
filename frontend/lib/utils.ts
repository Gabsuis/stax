import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Floor } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSqm(n: number, locale: string = "he"): string {
  if (!n || n === 0) return "—"
  const unit = locale === "he" ? "מ״ר" : "sqm"
  const numLocale = locale === "he" ? "he-IL" : "en-US"
  return n >= 10000
    ? `${(n / 1000).toFixed(0)}K ${unit}`
    : `${n.toLocaleString(numLocale)} ${unit}`
}

export function formatPrice(n: number, locale: string = "he"): string {
  if (!n || n === 0) return "—"
  const numLocale = locale === "he" ? "he-IL" : "en-US"
  return `₪${n.toLocaleString(numLocale)}`
}

export function getOccupancyColor(occ: number): string {
  if (occ >= 0.85) return "text-foreground"
  if (occ >= 0.65) return "text-muted-foreground"
  return "text-destructive"
}

export function calcVacantFloors(floors: Floor[]): number {
  return floors.filter(f => f.blocks.every(b => b.status === "vacant")).length
}

export function formatDate(d: Date | null, locale: string = "he"): string {
  if (!d) return "—"
  const dateLocale = locale === "he" ? "he-IL" : "en-US"
  return d.toLocaleDateString(dateLocale, { month: "2-digit", year: "numeric" })
}
