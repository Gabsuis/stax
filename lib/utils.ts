import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Floor } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSqm(n: number): string {
  if (!n || n === 0) return "—"
  return n >= 10000
    ? `${(n / 1000).toFixed(0)}K מ״ר`
    : `${n.toLocaleString("he-IL")} מ״ר`
}

export function formatPrice(n: number): string {
  if (!n || n === 0) return "—"
  return `₪${n.toLocaleString("he-IL")}`
}

export function getOccupancyColor(occ: number): string {
  if (occ >= 0.85) return "text-foreground"
  if (occ >= 0.65) return "text-muted-foreground"
  return "text-destructive"
}

export function calcVacantFloors(floors: Floor[]): number {
  return floors.filter(f => f.blocks.every(b => b.status === "vacant")).length
}

export function formatDate(d: Date | null): string {
  if (!d) return "—"
  return d.toLocaleDateString("he-IL", { month: "2-digit", year: "numeric" })
}
