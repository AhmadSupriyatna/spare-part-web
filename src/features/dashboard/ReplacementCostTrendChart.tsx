import type { MonthlyTrendPoint } from '@/features/dashboard/api'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const CHART_HEIGHT = 96

function monthLabel(month: string): string {
  const [, m] = month.split('-')
  return MONTH_LABELS[Number(m) - 1] ?? month
}

function compactRupiah(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}jt`
  if (value >= 1_000) return `${(value / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })}rb`
  return value.toLocaleString('id-ID')
}

/**
 * "Tren Replacement & Failure" — dual-axis combo: two thin qty bars per
 * month (failure_count destructive, replacement_count primary) against the
 * left axis, plus a cost line (replacement_cost, warning-amber) against its
 * own independent right-axis scale, since cost and count live on entirely
 * different magnitudes and would flatten each other on a shared scale.
 */
export function ReplacementCostTrendChart({ data }: { data: MonthlyTrendPoint[] }) {
  const maxQty = Math.max(1, ...data.map((d) => Math.max(d.failure_count, d.replacement_count)))
  const maxCost = Math.max(1, ...data.map((d) => Number(d.replacement_cost)))
  const totalQty = data.reduce((sum, d) => sum + d.failure_count + d.replacement_count, 0)

  if (totalQty === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada failure atau penggantian part tercatat dalam 12 bulan terakhir.</p>
  }

  const stepX = 100 / data.length
  const linePoints = data
    .map((d, i) => {
      const x = stepX * i + stepX / 2
      const y = CHART_HEIGHT - (Number(d.replacement_cost) / maxCost) * CHART_HEIGHT
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2.5 shrink-0 rounded-full bg-destructive" /> Failure (Qty)
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2.5 shrink-0 rounded-full bg-primary" /> Replacement (Qty)
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="h-0.5 w-3 shrink-0 rounded-full bg-warning" /> Biaya (Rp)
        </span>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute top-0 left-0 text-[9px] text-muted-foreground">Qty</div>
        <div className="pointer-events-none absolute top-0 right-0 text-[9px] text-muted-foreground">Rp</div>

        <div className="flex items-end gap-2 pt-4" style={{ height: CHART_HEIGHT }}>
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

        <svg
          className="pointer-events-none absolute top-4 left-0 h-[96px] w-full"
          viewBox={`0 0 100 ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline fill="none" stroke="var(--warning)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" points={linePoints} />
        </svg>
      </div>

      <div className="flex gap-2">
        {data.map((d) => (
          <span key={d.month} className="flex-1 text-center text-[9px] text-muted-foreground">
            {monthLabel(d.month)}
          </span>
        ))}
      </div>

      <p className="text-right text-[10px] text-muted-foreground">
        Biaya tertinggi: Rp {compactRupiah(maxCost)}
      </p>
    </div>
  )
}
