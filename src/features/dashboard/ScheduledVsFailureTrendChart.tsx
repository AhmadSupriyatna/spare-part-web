import type { ScheduledVsFailureTrendPoint } from '@/features/dashboard/api'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function monthLabel(month: string): string {
  const [, m] = month.split('-')
  return MONTH_LABELS[Number(m) - 1] ?? month
}

/**
 * "Tren Scheduled vs Failure" — horizontal grouped bars (scheduled_count
 * primary, failure_count destructive), one row per month, value printed at
 * the end of each bar. Scheduled = part installed by a PM Task; Failure =
 * part installed from an approved breakdown/QR replacement request — see
 * DashboardAnalyticsController::scheduledVsFailureTrend().
 */
export function ScheduledVsFailureTrendChart({ data, year }: { data: ScheduledVsFailureTrendPoint[]; year: number }) {
  const maxQty = Math.max(1, ...data.map((d) => Math.max(d.scheduled_count, d.failure_count)))
  const totalQty = data.reduce((sum, d) => sum + d.scheduled_count + d.failure_count, 0)

  if (totalQty === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada penggantian part tercatat tahun {year}.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2.5 shrink-0 rounded-full bg-primary" /> Scheduled
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2.5 shrink-0 rounded-full bg-destructive" /> Failure
        </span>
      </div>

      <div className="flex max-h-52 flex-col gap-1 overflow-y-auto pr-1">
        {data.map((d) => (
          <div key={d.month} className="flex items-center gap-1.5">
            <span className="w-6 shrink-0 text-right text-[9px] text-muted-foreground">{monthLabel(d.month)}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${d.scheduled_count > 0 ? Math.max((d.scheduled_count / maxQty) * 100, 4) : 0}%` }}
                  />
                </div>
                <span className="w-7 shrink-0 text-right text-[9px] tabular-nums text-muted-foreground">{d.scheduled_count}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-destructive"
                    style={{ width: `${d.failure_count > 0 ? Math.max((d.failure_count / maxQty) * 100, 4) : 0}%` }}
                  />
                </div>
                <span className="w-7 shrink-0 text-right text-[9px] tabular-nums text-muted-foreground">{d.failure_count}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
