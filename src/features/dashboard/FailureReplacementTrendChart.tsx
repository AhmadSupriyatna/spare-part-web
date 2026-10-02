import type { MonthlyTrendPoint } from '@/features/dashboard/api'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const CHART_HEIGHT = 96

function monthLabel(month: string): string {
  const [, m] = month.split('-')
  return MONTH_LABELS[Number(m) - 1] ?? month
}

/**
 * "Tren Replacement & Failure" — qty only (failure_count destructive,
 * replacement_count primary). Split out from the cost trend (now
 * MonthlyCostTrendChart) per explicit request — count and cost don't need
 * to live on the same combo chart.
 */
export function FailureReplacementTrendChart({ data }: { data: MonthlyTrendPoint[] }) {
  const maxQty = Math.max(1, ...data.map((d) => Math.max(d.failure_count, d.replacement_count)))
  const totalQty = data.reduce((sum, d) => sum + d.failure_count + d.replacement_count, 0)

  if (totalQty === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada failure atau penggantian part tercatat dalam 12 bulan terakhir.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2.5 shrink-0 rounded-full bg-destructive" /> Failure
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2.5 shrink-0 rounded-full bg-primary" /> Replacement
        </span>
      </div>

      <div className="flex items-end gap-1.5" style={{ height: CHART_HEIGHT }}>
        {data.map((d) => (
          <div key={d.month} className="flex h-full flex-1 items-end justify-center gap-0.5">
            <div className="flex h-full w-2 flex-col justify-end">
              <div
                className="w-full rounded-t bg-destructive"
                style={{ height: `${d.failure_count > 0 ? Math.max((d.failure_count / maxQty) * 100, 4) : 0}%` }}
                title={`${monthLabel(d.month)} — Failure: ${d.failure_count}`}
              />
            </div>
            <div className="flex h-full w-2 flex-col justify-end">
              <div
                className="w-full rounded-t bg-primary"
                style={{ height: `${d.replacement_count > 0 ? Math.max((d.replacement_count / maxQty) * 100, 4) : 0}%` }}
                title={`${monthLabel(d.month)} — Replacement: ${d.replacement_count}`}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5">
        {data.map((d) => (
          <span key={d.month} className="flex-1 text-center text-[9px] text-muted-foreground">
            {monthLabel(d.month)}
          </span>
        ))}
      </div>
    </div>
  )
}
