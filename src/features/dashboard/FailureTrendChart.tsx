import { cn } from '@/lib/utils'
import type { MonthlyCount } from '@/features/dashboard/api'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function monthLabel(month: string): string {
  const [, m] = month.split('-')
  return MONTH_LABELS[Number(m) - 1] ?? month
}

/** Branch-wide failure/breakdown count, 12 months — same shape as the per-machine chart on the Monitoring page, single hue (destructive), thin rounded-top bars, count shown above each bar. */
export function FailureTrendChart({ data }: { data: MonthlyCount[] }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  const total = data.reduce((sum, d) => sum + d.count, 0)

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Tidak ada failure/breakdown tercatat dalam 12 bulan terakhir.</p>
  }

  return (
    <div className="flex h-28 items-end gap-1.5">
      {data.map((d) => (
        <div key={d.month} className="flex flex-1 flex-col items-center gap-0.5">
          <span className="text-[10px] font-medium tabular-nums text-foreground">{d.count > 0 ? d.count : ''}</span>
          <div className="flex h-16 w-full items-end" title={`${monthLabel(d.month)}: ${d.count} kejadian`}>
            <div
              className={cn('w-full rounded-t', d.count > 0 ? 'bg-destructive' : 'bg-muted')}
              style={{ height: `${d.count > 0 ? Math.max((d.count / max) * 100, 6) : 3}%` }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground">{monthLabel(d.month)}</span>
        </div>
      ))}
    </div>
  )
}
