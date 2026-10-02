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
 * "Tren Biaya Bulanan" — the replacement_cost series split out of the old
 * combo chart into its own bar chart (same source as cost_heatmap/
 * cost_by_part), one bar per month instead of overlaying a line on top of
 * an unrelated qty scale.
 */
export function MonthlyCostTrendChart({ data }: { data: MonthlyTrendPoint[] }) {
  const maxCost = Math.max(1, ...data.map((d) => Number(d.replacement_cost)))
  const totalCost = data.reduce((sum, d) => sum + Number(d.replacement_cost), 0)

  if (totalCost === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada biaya tercatat dalam 12 bulan terakhir.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-1.5" style={{ height: CHART_HEIGHT }}>
        {data.map((d) => {
          const cost = Number(d.replacement_cost)
          return (
            <div key={d.month} className="flex h-full flex-1 items-end justify-center">
              <div
                className="w-full max-w-4 rounded-t bg-warning"
                style={{ height: `${cost > 0 ? Math.max((cost / maxCost) * 100, 4) : 0}%` }}
                title={`${monthLabel(d.month)} — Rp ${cost.toLocaleString('id-ID')}`}
              />
            </div>
          )
        })}
      </div>

      <div className="flex gap-1.5">
        {data.map((d) => (
          <span key={d.month} className="flex-1 text-center text-[9px] text-muted-foreground">
            {monthLabel(d.month)}
          </span>
        ))}
      </div>

      <p className="text-right text-[10px] text-muted-foreground">Biaya tertinggi: Rp {compactRupiah(maxCost)}</p>
    </div>
  )
}
