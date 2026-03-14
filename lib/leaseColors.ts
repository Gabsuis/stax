import { differenceInMonths } from "date-fns"

export type LeaseUrgency = "safe" | "watch" | "urgent" | "unknown"

export function getLeaseUrgency(leaseEnd: Date | null): LeaseUrgency {
  if (!leaseEnd) return "unknown"
  const months = differenceInMonths(leaseEnd, new Date())
  if (months < 6) return "urgent"
  if (months < 24) return "watch"
  return "safe"
}

export function getLeaseColor(leaseEnd: Date | null): string {
  const urgency = getLeaseUrgency(leaseEnd)
  const map: Record<LeaseUrgency, string> = {
    safe: "#16a34a",
    watch: "#d97706",
    urgent: "#dc2626",
    unknown: "#52525b",
  }
  return map[urgency]
}

export function getLeaseLabel(leaseEnd: Date | null): string {
  if (!leaseEnd) return "ללא תאריך"
  const months = differenceInMonths(leaseEnd, new Date())
  if (months < 0) return "פג תוקף"
  if (months === 0) return "החודש"
  if (months < 12) return `${months} חודשים`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem > 0 ? `${years}ש׳ ${rem}ח׳` : `${years} שנים`
}

export const LEASE_LEGEND = [
  { color: "#16a34a", label: "מעל 24 חודש" },
  { color: "#d97706", label: "6–24 חודש" },
  { color: "#dc2626", label: "פחות מ-6 חודש" },
  { color: "transparent", border: "1px dashed rgba(255,255,255,0.3)", label: "פנוי" },
] as const
