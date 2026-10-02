interface AmbientSignalBarSegment {
  key: string
  label: string
  value: number
  colorVar: string
}

interface AmbientSignalBarProps {
  segments: AmbientSignalBarSegment[]
  primaryValue: string
  primaryLabel: string
  /** CSS color (e.g. 'var(--destructive)') for the bar's ambient glow — caller decides which severity is "worst" since that differs per chart (3-tier health vs 2-tier on-time/late). */
  glowColorVar: string
  emptyMessage: string
  footnote?: string
}

/**
 * A single continuous rounded strip, segmented by each value's share of the
 * total, with a soft glow in the worst-severity color — reads like a
 * status-light strip on real plant equipment. Shared by Inventory Health
 * (3 segments) and Maintenance Performance (2 segments) instead of each
 * reimplementing the same bar.
 */
export function AmbientSignalBar({ segments, primaryValue, primaryLabel, glowColorVar, emptyMessage, footnote }: AmbientSignalBarProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-semibold tabular-nums">{primaryValue}</span>
        <span className="text-xs text-muted-foreground">{primaryLabel}</span>
      </div>

      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" style={{ boxShadow: `0 0 10px -1px ${glowColorVar}` }}>
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div
              key={s.key}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.colorVar }}
              title={`${s.label}: ${s.value}`}
            />
          ))}
      </div>

      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.colorVar }} />
            {s.label} <span className="font-medium text-foreground tabular-nums">{s.value}</span>
            <span className="text-xs">({Math.round((s.value / total) * 100)}%)</span>
          </span>
        ))}
      </div>

      {footnote && <p className="text-center text-xs text-muted-foreground">{footnote}</p>}
    </div>
  )
}
