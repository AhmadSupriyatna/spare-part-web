import type { AtRiskPart } from '@/features/dashboard/api'

function severityColor(percentUsed: number | null): string {
  return percentUsed != null && percentUsed >= 95 ? 'text-destructive' : 'text-warning'
}

/**
 * "Life Based Part Performance" — plain list instead of the old radial bar
 * chart: an average-life summary stat up top, then every at-risk part as a
 * row (name + where it's installed + % terpakai), scrollable once there
 * are more than a handful — simpler to scan than concentric rings once the
 * list gets long.
 */
export function LifeBasedList({ parts }: { parts: AtRiskPart[] }) {
  if (parts.length === 0) {
    return <p className="text-sm text-muted-foreground">Tidak ada part life-based yang mendekati akhir umur pakai.</p>
  }

  const withPercent = parts.filter((p) => p.percent_used != null)
  const average = withPercent.length > 0 ? Math.round(withPercent.reduce((sum, p) => sum + (p.percent_used ?? 0), 0) / withPercent.length) : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between border-b pb-3">
        <span className="text-2xl font-semibold tabular-nums">{average ?? '-'}%</span>
        <span className="text-xs text-muted-foreground">rata-rata umur terpakai ({parts.length} part)</span>
      </div>

      <div className="scroll-thin flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
        {parts.map((part) => (
          <div key={`${part.part_name}-${part.equipment_name}`} className="flex items-center justify-between gap-2 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{part.part_name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[part.line_name, part.machine_name, part.equipment_name].filter(Boolean).join(' / ')}
              </p>
            </div>
            <span className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${severityColor(part.percent_used)}`}>
              {part.percent_used ?? '-'}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
