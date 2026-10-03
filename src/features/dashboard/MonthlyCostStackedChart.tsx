import { useState } from 'react'
import type { MonthlyCostByLineRow, MonthlyCostByPmFailureRow } from '@/features/dashboard/api'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

interface Segment {
  key: string
  label: string
  value: number
  colorVar: string
}

function monthLabel(month: string): string {
  const [, m] = month.split('-')
  return MONTH_LABELS[Number(m) - 1] ?? month
}

/** Same rotating categorical palette as HierarchicalSunburst/RadialMapChart — Line identity, not a status. */
function hueFor(index: number): string {
  return `hsl(${(index * 63) % 360} 62% 52%)`
}

/**
 * "Tren Biaya Bulanan" — horizontal stacked bars, one row per month, value
 * printed at the end, switchable between two stacking modes via Tabs:
 * "Per Line" (a dynamic categorical segment per Line, colored same as the
 * sunburst charts) or "PM vs Schedule" (fixed PM/Failure split, same colors
 * as PmVsFailureCostChart). Hover a segment for an exact-value readout
 * below the chart; month rows scroll internally past a fixed height instead
 * of growing the card.
 */
export function MonthlyCostStackedChart({
  byLine,
  byPmFailure,
  year,
  formatValue,
}: {
  byLine: MonthlyCostByLineRow[]
  byPmFailure: MonthlyCostByPmFailureRow[]
  year: number
  formatValue: (value: number) => string
}) {
  const [mode, setMode] = useState<'line' | 'pm_failure'>('line')
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  const lineNames = Array.from(new Set(byLine.map((r) => r.line_name))).sort()
  const lineColor = (name: string) => hueFor(lineNames.indexOf(name))

  const monthsByLine = new Map<string, Segment[]>()
  byLine.forEach((row) => {
    const segments = monthsByLine.get(row.month) ?? []
    segments.push({ key: row.line_name, label: row.line_name, value: Number(row.cost), colorVar: lineColor(row.line_name) })
    monthsByLine.set(row.month, segments)
  })

  const months =
    mode === 'line'
      ? Array.from(monthsByLine.keys()).sort()
      : byPmFailure.map((r) => r.month)

  const rows = months.map((month) => {
    if (mode === 'line') {
      return { month, segments: monthsByLine.get(month) ?? [] }
    }
    const row = byPmFailure.find((r) => r.month === month)
    return {
      month,
      segments: [
        { key: 'pm', label: 'PM', value: Number(row?.pm_cost ?? '0'), colorVar: 'var(--success)' },
        { key: 'failure', label: 'Failure', value: Number(row?.failure_cost ?? '0'), colorVar: 'var(--destructive)' },
      ] as Segment[],
    }
  })

  const maxTotal = Math.max(1, ...rows.map((r) => r.segments.reduce((sum, s) => sum + s.value, 0)))
  const grandTotal = rows.reduce((sum, r) => sum + r.segments.reduce((s2, s) => s2 + s.value, 0), 0)

  let hoveredSegment: Segment | null = null
  let hoveredMonth: string | null = null
  for (const row of rows) {
    const found = row.segments.find((s) => `${row.month}|${s.key}` === hoveredKey)
    if (found) {
      hoveredSegment = found
      hoveredMonth = row.month
      break
    }
  }

  if (grandTotal === 0) {
    return (
      <div className="flex flex-col gap-2">
        <ModeTabs mode={mode} onModeChange={setMode} />
        <p className="text-sm text-muted-foreground">Belum ada biaya tercatat tahun {year}.</p>
      </div>
    )
  }

  const legendItems = mode === 'line' ? lineNames.map((name) => ({ key: name, label: name, colorVar: lineColor(name) })) : rows[0]?.segments.map((s) => ({ key: s.key, label: s.label, colorVar: s.colorVar })) ?? []

  return (
    <div className="flex flex-col gap-2">
      <ModeTabs mode={mode} onModeChange={setMode} />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {legendItems.map((item) => (
          <span key={item.key} className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.colorVar }} />
            {item.label}
          </span>
        ))}
      </div>

      <div className="flex max-h-52 flex-col gap-1.5 overflow-y-auto pr-1">
        {rows.map((row) => {
          const total = row.segments.reduce((sum, s) => sum + s.value, 0)
          return (
            <div key={row.month} className="flex items-center gap-1.5">
              <span className="w-6 shrink-0 text-right text-[9px] text-muted-foreground">{monthLabel(row.month)}</span>
              <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                {total > 0 &&
                  row.segments
                    .filter((s) => s.value > 0)
                    .map((s) => {
                      const segKey = `${row.month}|${s.key}`
                      return (
                        <div
                          key={s.key}
                          className="h-full cursor-pointer transition-opacity"
                          style={{
                            width: `${(s.value / maxTotal) * 100}%`,
                            backgroundColor: s.colorVar,
                            opacity: hoveredKey && hoveredKey !== segKey ? 0.45 : 1,
                          }}
                          onMouseEnter={() => setHoveredKey(segKey)}
                          onMouseLeave={() => setHoveredKey((current) => (current === segKey ? null : current))}
                        >
                          <title>
                            {monthLabel(row.month)} — {s.label}: {formatValue(s.value)}
                          </title>
                        </div>
                      )
                    })}
              </div>
              <span className="w-14 shrink-0 text-right text-[9px] tabular-nums text-muted-foreground">{formatValue(total)}</span>
            </div>
          )
        })}
      </div>

      <div className="flex h-5 items-center justify-center text-center text-xs">
        {hoveredSegment && hoveredMonth ? (
          <span>
            <span className="text-muted-foreground">
              {monthLabel(hoveredMonth)} — {hoveredSegment.label}:
            </span>{' '}
            <span className="font-medium tabular-nums">{formatValue(hoveredSegment.value)}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Arahkan kursor ke segmen untuk detail</span>
        )}
      </div>
    </div>
  )
}

function ModeTabs({ mode, onModeChange }: { mode: 'line' | 'pm_failure'; onModeChange: (mode: 'line' | 'pm_failure') => void }) {
  return (
    <Tabs value={mode} onValueChange={(value) => onModeChange(value as 'line' | 'pm_failure')}>
      <TabsList>
        <TabsTrigger value="line">Per Line</TabsTrigger>
        <TabsTrigger value="pm_failure">PM vs Schedule</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
