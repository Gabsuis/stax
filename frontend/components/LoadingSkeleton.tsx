"use client"

/* ------------------------------------------------------------------ */
/*  Shimmer bar + skeleton variants for the dark glassmorphism theme  */
/* ------------------------------------------------------------------ */

const shimmerKeyframes = `
@keyframes skeleton-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`

/** Injects the shimmer keyframes once into the document head. */
function ShimmerStyle() {
  return <style dangerouslySetInnerHTML={{ __html: shimmerKeyframes }} />
}

/** Base shimmer bar — rounded rectangle with a travelling highlight. */
function Bone({
  className = "",
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={`rounded-md ${className}`}
      style={{
        background:
          "linear-gradient(90deg, var(--color-secondary) 0%, oklch(1 0 0 / 6%) 50%, var(--color-secondary) 100%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.8s ease-in-out infinite",
        ...style,
      }}
    />
  )
}

/* ================================================================== */
/*  1. BuildingsTableSkeleton                                         */
/*     8 columns, 6 rows — matches the buildings table layout         */
/* ================================================================== */

export function BuildingsTableSkeleton() {
  return (
    <>
      <ShimmerStyle />
      <div className="glass-strong rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {[
                { align: "text-start", px: "px-5" },
                { align: "text-start", px: "px-4" },
                { align: "text-start", px: "px-4" },
                { align: "text-end", px: "px-4" },
                { align: "text-end", px: "px-4" },
                { align: "text-end", px: "px-4" },
                { align: "text-end", px: "px-4" },
                { align: "text-end", px: "px-5" },
              ].map((col, i) => (
                <th key={i} className={`${col.align} ${col.px} py-4`}>
                  <Bone className="h-3 w-16 inline-block" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, row) => (
              <tr key={row} className="border-b border-border/50">
                {/* Name (wider, two lines) */}
                <td className="px-5 py-4">
                  <Bone className="h-3.5 w-36 mb-1.5" />
                  <Bone className="h-2.5 w-24" />
                </td>
                {/* Class */}
                <td className="px-4 py-4">
                  <Bone className="h-5 w-14 rounded-full" />
                </td>
                {/* Area */}
                <td className="px-4 py-4">
                  <Bone className="h-3.5 w-20" />
                </td>
                {/* Total sqm */}
                <td className="px-4 py-4 text-end">
                  <Bone className="h-3.5 w-16 ms-auto" />
                </td>
                {/* Vacant sqm */}
                <td className="px-4 py-4 text-end">
                  <Bone className="h-3.5 w-14 ms-auto" />
                </td>
                {/* Occupancy */}
                <td className="px-4 py-4 text-end">
                  <Bone className="h-3.5 w-10 ms-auto" />
                </td>
                {/* Price */}
                <td className="px-4 py-4 text-end">
                  <Bone className="h-3.5 w-14 ms-auto" />
                </td>
                {/* Floors */}
                <td className="px-5 py-4 text-end">
                  <Bone className="h-3.5 w-8 ms-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ================================================================== */
/*  2. BuildingsCardsSkeleton                                         */
/*     4-col responsive grid — matches the card grid layout           */
/* ================================================================== */

function CardBone() {
  return (
    <div className="glass-strong rounded-2xl p-5 space-y-5">
      {/* Header: tags + title */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Bone className="h-4 w-10 rounded-full" />
          <Bone className="h-4 w-14 rounded-full" />
        </div>
        <Bone className="h-4 w-40 mb-1" />
        <Bone className="h-3 w-28" />
      </div>

      {/* Metrics 3-col */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <Bone className="h-4 w-16 mb-1" />
            <Bone className="h-2.5 w-12" />
          </div>
        ))}
      </div>

      {/* Address */}
      <Bone className="h-3 w-48" />

      {/* Occupancy bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Bone className="h-2.5 w-16" />
          <Bone className="h-2.5 w-8" />
        </div>
        <Bone className="h-1 w-full rounded-full" />
      </div>
    </div>
  )
}

export function BuildingsCardsSkeleton() {
  return (
    <>
      <ShimmerStyle />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardBone key={i} />
        ))}
      </div>
    </>
  )
}

/* ================================================================== */
/*  3. DashboardSkeleton                                              */
/*     KPI strip (6 cells) + 3 content panels below                   */
/* ================================================================== */

export function DashboardSkeleton() {
  return (
    <>
      <ShimmerStyle />
      <div className="space-y-7">
        {/* KPI strip */}
        <div className="glass-strong rounded-2xl overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`py-5 px-5 ${i > 0 ? "border-s border-border" : ""}`}
              >
                <Bone className="h-2.5 w-20 mb-3" />
                <Bone className="h-6 w-24" />
              </div>
            ))}
          </div>
        </div>

        {/* Three content panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-strong rounded-2xl p-6 space-y-4">
              <Bone className="h-4 w-32 mb-2" />
              {Array.from({ length: 4 }).map((_, j) => (
                <Bone
                  key={j}
                  className="h-3 w-full"
                  style={{ opacity: 1 - j * 0.15 }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

/* ================================================================== */
/*  4. ImportSkeleton                                                 */
/*     Simple centered shimmer — for import / upload screens          */
/* ================================================================== */

export function ImportSkeleton() {
  return (
    <>
      <ShimmerStyle />
      <div className="flex flex-col items-center justify-center py-24 space-y-5">
        {/* Faux file icon */}
        <Bone className="h-16 w-16 rounded-xl" />
        {/* Title line */}
        <Bone className="h-4 w-48" />
        {/* Subtitle line */}
        <Bone className="h-3 w-32" />
        {/* Progress bar placeholder */}
        <Bone className="h-2 w-64 rounded-full" />
      </div>
    </>
  )
}
