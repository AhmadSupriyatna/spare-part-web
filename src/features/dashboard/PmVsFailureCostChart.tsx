import { useState } from 'react'
import type { PmVsFailureCost } from '@/features/dashboard/api'

const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

const SIZE = 150
const CENTER = SIZE / 2
const OUTER_R = 62
const INNER_R = 36
const EXPLODE = 5
const GAP_DEG = 2

function polarToCartesian(radius: number, angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) }
}

function donutSegmentPath(rInner: number, rOuter: number, startAngle: number, endAngle: number): string {
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
 * "Sebaran Cost PM vs Failure" (tahun yang dipilih di dashboard) — a full
 * donut with its two slices pulled slightly outward ("exploded") instead of
 * Gauge's semicircle instrument, per explicit request. PM=success, Failure=
 * destructive, same good/bad mapping Maintenance Performance uses for
 * on-time/late — more spend on planned work vs reactive failure is the
 * healthier pattern. Hover a slice for an exact-value readout below the
 * chart, since the exploded gap already does the job a legend would.
 */
export function PmVsFailureCostChart({ pm_cost, failure_cost, year }: PmVsFailureCost & { year: number }) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const pmCost = Number(pm_cost)
  const failureCost = Number(failure_cost)
  const total = pmCost + failureCost

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada biaya PM atau failure tercatat tahun {year}.</p>
  }

  const pmPercent = Math.round((pmCost / total) * 100)
  const segments = [
    { key: 'pm', label: 'PM', value: pmCost, colorVar: 'var(--success)' },
    { key: 'failure', label: 'Failure', value: failureCost, colorVar: 'var(--destructive)' },
  ]

  let cursor = 0
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const span = (s.value / total) * 360
      const start = cursor
      const end = cursor + Math.max(span - GAP_DEG, 0)
      cursor += span
      return { ...s, start, end, mid: (start + end) / 2, percent: Math.round((s.value / total) * 100) }
    })

  const hovered = arcs.find((a) => a.key === hoveredKey) ?? null

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Sebaran cost PM vs Failure tahun ${year}`}>
        {arcs.map((a) => {
          const rad = ((a.mid - 90) * Math.PI) / 180
          const dx = EXPLODE * Math.cos(rad)
          const dy = EXPLODE * Math.sin(rad)
          return (
            <path
              key={a.key}
              d={donutSegmentPath(INNER_R, OUTER_R, a.start, a.end)}
              fill={a.colorVar}
              transform={`translate(${dx}, ${dy})`}
              opacity={hoveredKey === a.key ? 1 : 0.88}
              className="cursor-pointer transition-opacity"
              onMouseEnter={() => setHoveredKey(a.key)}
              onMouseLeave={() => setHoveredKey((current) => (current === a.key ? null : current))}
            >
              <title>
                {a.label}: {currencyFormatter.format(a.value)} ({a.percent}%)
              </title>
            </path>
          )
        })}
        <text x={CENTER} y={CENTER - 4} textAnchor="middle" className="fill-foreground text-base font-semibold">
          {pmPercent}%
        </text>
        <text x={CENTER} y={CENTER + 12} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          biaya PM
        </text>
      </svg>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-sm">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.colorVar }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="flex h-6 items-center justify-center text-center text-xs">
        {hovered ? (
          <span>
            <span className="text-muted-foreground">{hovered.label}:</span>{' '}
            <span className="font-medium tabular-nums">{currencyFormatter.format(hovered.value)}</span>{' '}
            <span className="text-muted-foreground">({hovered.percent}%)</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Biaya part keluar, tahun {year}</span>
        )}
      </div>
    </div>
  )
}
