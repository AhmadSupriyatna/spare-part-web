const SIZE = 200
const CENTER = SIZE / 2
const INNER_R0 = 30 // hole radius
const INNER_R1 = 55 // Line ring outer radius
const OUTER_R1 = 88 // Machine ring outer radius
const GAP_DEG = 1.2 // thin visual separation between segments

interface RadialCell {
  line_name: string
  machine_name: string
  count: number
}

/** A rotating categorical palette — this is a "which Line/Machine" identity, not a status, so it deliberately avoids the app's reserved status colors (destructive/warning/success). */
function hueFor(index: number): string {
  return `hsl(${(index * 63) % 360} 62% 52%)`
}

function polarToCartesian(radius: number, angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) }
}

function ringSegmentPath(rInner: number, rOuter: number, startAngle: number, endAngle: number): string {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  const startOuter = polarToCartesian(rOuter, endAngle)
  const endOuter = polarToCartesian(rOuter, startAngle)
  const startInner = polarToCartesian(rInner, endAngle)
  const endInner = polarToCartesian(rInner, startAngle)

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ')
}

/**
 * Two-ring sunburst: inner ring is one segment per Line, outer ring one
 * segment per Machine (nested within its Line's own angular span), both
 * sized by `count`. Shared by "Radial Map Failure" (failure/breakdown
 * count) and "Mapping Instalasi Part" (currently-installed count) — both
 * are the exact same {line_name, machine_name, count} shape, just counting
 * different things, so one chart renders either.
 */
export function RadialMapChart({
  data,
  centerLabel,
  emptyMessage,
  ariaLabel,
}: {
  data: RadialCell[]
  centerLabel: string
  emptyMessage: string
  ariaLabel: string
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  const lineNames = Array.from(new Set(data.map((d) => d.line_name)))
  const lineTotals = lineNames.map((name) => ({
    name,
    total: data.filter((d) => d.line_name === name).reduce((sum, d) => sum + d.count, 0),
  }))

  const lineSegments = lineTotals.reduce<{ name: string; total: number; start: number; end: number; color: string }[]>(
    (acc, line, i) => {
      const prevEnd = acc.length > 0 ? acc[acc.length - 1].end : 0
      const span = (line.total / total) * 360
      acc.push({ ...line, start: prevEnd, end: prevEnd + Math.max(span - GAP_DEG, 0), color: hueFor(i) })
      return acc
    },
    [],
  )

  const machineSegments = lineSegments.flatMap((line) => {
    const machines = data.filter((d) => d.line_name === line.name)
    const lineSpan = line.end - line.start
    return machines.reduce<{ line_name: string; machine_name: string; count: number; start: number; end: number; color: string }[]>(
      (acc, machine) => {
        const prevEnd = acc.length > 0 ? acc[acc.length - 1].end : line.start
        const span = line.total > 0 ? (machine.count / line.total) * lineSpan : 0
        acc.push({ ...machine, start: prevEnd, end: prevEnd + Math.max(span - GAP_DEG * 0.5, 0), color: line.color })
        return acc
      },
      [],
    )
  })

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={ariaLabel}>
        {lineSegments.map((seg) => (
          <path key={seg.name} d={ringSegmentPath(INNER_R0, INNER_R1, seg.start, seg.end)} fill={seg.color} opacity={0.9}>
            <title>
              {seg.name}: {seg.total}
            </title>
          </path>
        ))}
        {machineSegments.map((seg) => (
          <path
            key={`${seg.line_name}-${seg.machine_name}`}
            d={ringSegmentPath(INNER_R1 + 2, OUTER_R1, seg.start, seg.end)}
            fill={seg.color}
            opacity={0.45}
          >
            <title>
              {seg.line_name} · {seg.machine_name}: {seg.count}
            </title>
          </path>
        ))}
        <text x={CENTER} y={CENTER - 4} textAnchor="middle" className="fill-foreground text-lg font-semibold">
          {total}
        </text>
        <text x={CENTER} y={CENTER + 12} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          {centerLabel}
        </text>
      </svg>

      <div className="flex w-full flex-col gap-1">
        {lineSegments
          .slice()
          .sort((a, b) => b.total - a.total)
          .slice(0, 4)
          .map((seg) => (
            <div key={seg.name} className="flex items-center gap-2 text-xs">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{seg.name}</span>
              <span className="font-medium tabular-nums">{seg.total}</span>
            </div>
          ))}
      </div>
    </div>
  )
}
