export interface GaugeSegment {
  key: string
  label: string
  value: number
  colorVar: string
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 180) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, startAngle)
  const end = polarToCartesian(cx, cy, r, endAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

/**
 * Semicircle instrument gauge — one or more ordered segments filling a
 * 180° arc left-to-right, reading centered below. Same "status color,
 * never a series" rule as every other chart here: each segment's colorVar
 * is a semantic status (success/warning/destructive), not a categorical
 * palette.
 */
export function Gauge({
  segments,
  primaryValue,
  primaryLabel,
  size = 200,
}: {
  segments: GaugeSegment[]
  primaryValue: string
  primaryLabel: string
  size?: number
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const cx = size / 2
  const cy = size * 0.62
  const r = size * 0.41
  const trackWidth = size * 0.09

  const arcs = segments
    .filter((s) => s.value > 0)
    .reduce<(GaugeSegment & { startAngle: number; endAngle: number })[]>((acc, s) => {
      const startAngle = acc.length > 0 ? acc[acc.length - 1].endAngle : 0
      const endAngle = total > 0 ? startAngle + (s.value / total) * 180 : 0
      acc.push({ ...s, startAngle, endAngle })
      return acc
    }, [])

  return (
    <svg width={size} height={size * 0.68} viewBox={`0 0 ${size} ${size * 0.68}`} role="img" aria-label={`${primaryLabel}: ${primaryValue}`}>
      <path d={arcPath(cx, cy, r, 0, 180)} fill="none" stroke="var(--muted)" strokeWidth={trackWidth} strokeLinecap="round" />
      {arcs.map((a) => (
        <path
          key={a.key}
          d={arcPath(cx, cy, r, a.startAngle, a.endAngle)}
          fill="none"
          stroke={a.colorVar}
          strokeWidth={trackWidth}
          strokeLinecap={arcs.length === 1 ? 'round' : 'butt'}
        />
      ))}
      <text x={cx} y={cy - size * 0.14} textAnchor="middle" className="fill-foreground" style={{ fontSize: size * 0.135, fontWeight: 700 }}>
        {primaryValue}
      </text>
      <text x={cx} y={cy - size * 0.02} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: size * 0.05 }}>
        {primaryLabel}
      </text>
    </svg>
  )
}
