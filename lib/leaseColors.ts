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
    safe: "#10b981",
    watch: "#f59e0b",
    urgent: "#f43f5e",
    unknown: "#64748b",
  }
  return map[urgency]
}

/** Returns a lease label key + params for use with translations.
 *  Components should use t(key, params) from the "lease" namespace. */
export function getLeaseLabelParts(leaseEnd: Date | null): { key: string; params?: Record<string, number> } {
  if (!leaseEnd) return { key: "noDate" }
  const months = differenceInMonths(leaseEnd, new Date())
  if (months < 0) return { key: "expired" }
  if (months === 0) return { key: "thisMonth" }
  if (months < 12) return { key: "months", params: { count: months } }
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem > 0
    ? { key: "yearsMonths", params: { years, months: rem } }
    : { key: "years", params: { years } }
}
