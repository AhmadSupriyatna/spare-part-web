import type { AtRiskPart } from '@/features/dashboard/api'

const SIZE = 200
const CENTER = SIZE / 2
const R_MIN = 20
const R_MAX = 92

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

/** A near-full-circle arc, clockwise from 12 o'clock — capped just short of 360° since a path's start/end point would otherwise coincide and collapse the arc. */
function ringArcPath(cx: number, cy: number, r: number, sweepDeg: number): string {
  const end = Math.min(sweepDeg, 359.9)
  const start = polarToCartesian(cx, cy, r, 0)
  const stop = polarToCartesian(cx, cy, r, end)
  const largeArc = end > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${stop.x} ${stop.y}`
}

function severityColor(percentUsed: number | null): string {
  return percentUsed != null && percentUsed >= 95 ? 'var(--destructive)' : 'var(--warning)'
}

/**
 * "Life Based Part Performance" — a radial bar chart: one ring per at-risk
 * part, each ring's filled sweep (clockwise from 12 o'clock) proportional
 * to its percent_used, colored by severity (destructive ≥95%, warning
 * otherwise). Innermost ring is the part closest to end-of-life, since
 * at_risk_parts already arrives sorted that way.
 */
export function LifeBasedRadialChart({ parts }: { parts: AtRiskPart[] }) {
  if (parts.length === 0) {
    return <p className="text-sm text-muted-foreground">Tidak ada part life-based yang mendekati akhir umur pakai.</p>
  }

  const ringGap = (R_MAX - R_MIN) / parts.length
  const thickness = Math.max(ringGap * 0.62, 4)
  const rings = parts.map((part, i) => ({
    part,
    radius: R_MIN + ringGap * (i + 0.5),
    color: severityColor(part.percent_used),
  }))

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Life Based Part Performance — radial bar per part">
        {rings.map((ring) => (
          <circle key={`${ring.part.part_name}-track`} cx={CENTER} cy={CENTER} r={ring.radius} fill="none" stroke="var(--muted)" strokeWidth={thickness} />
        ))}
        {rings.map((ring) => (
          <path
            key={`${ring.part.part_name}-value`}
            d={ringArcPath(CENTER, CENTER, ring.radius, ((ring.part.percent_used ?? 0) / 100) * 360)}
            fill="none"
            stroke={ring.color}
            strokeWidth={thickness}
            strokeLinecap="round"
          >
            <title>
              {ring.part.part_name}: {ring.part.percent_used}% terpakai
            </title>
          </path>
        ))}
      </svg>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {rings.map((ring) => (
          <div key={ring.part.part_name} className="flex items-center gap-2 text-xs">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: ring.color }} />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{ring.part.part_name}</span>
            <span className="font-mono font-medium text-foreground">{ring.part.percent_used}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
