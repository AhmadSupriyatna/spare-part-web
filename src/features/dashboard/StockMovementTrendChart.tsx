import type { StockMovementTrendPoint } from '@/features/dashboard/api'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const CHART_HEIGHT = 96

function monthLabel(month: string): string {
  const [, m] = month.split('-')
  return MONTH_LABELS[Number(m) - 1] ?? month
}

/**
 * "Tren Keluar-Masuk Stok" — two bar series per month (in_qty success,
 * out_qty destructive), same hand-rolled div-bar approach as
 * ReplacementCostTrendChart, just without its cost-line overlay since both
 * series here share the same quantity scale.
 */
export function StockMovementTrendChart({ data }: { data: StockMovementTrendPoint[] }) {
  const maxQty = Math.max(1, ...data.map((d) => Math.max(d.in_qty, d.out_qty)))
  const totalQty = data.reduce((sum, d) => sum + d.in_qty + d.out_qty, 0)

  if (totalQty === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada pergerakan stok tercatat dalam 12 bulan terakhir.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2.5 shrink-0 rounded-full bg-success" /> Masuk
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2.5 shrink-0 rounded-full bg-destructive" /> Keluar
        </span>
      </div>

      <div className="flex items-end gap-2" style={{ height: CHART_HEIGHT }}>
        {data.map((d) => (
          <div key={d.month} className="flex h-full flex-1 items-end justify-center gap-0.5">
            <div className="flex h-full w-2 flex-col justify-end">
              <div
                className="w-full rounded-t bg-success"
                style={{ height: `${d.in_qty > 0 ? Math.max((d.in_qty / maxQty) * 100, 4) : 0}%` }}
                title={`${monthLabel(d.month)} — Masuk: ${d.in_qty}`}
              />
            </div>
            <div className="flex h-full w-2 flex-col justify-end">
              <div
                className="w-full rounded-t bg-destructive"
                style={{ height: `${d.out_qty > 0 ? Math.max((d.out_qty / maxQty) * 100, 4) : 0}%` }}
                title={`${monthLabel(d.month)} — Keluar: ${d.out_qty}`}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {data.map((d) => (
          <span key={d.month} className="flex-1 text-center text-[9px] text-muted-foreground">
            {monthLabel(d.month)}
          </span>
        ))}
      </div>
    </div>
  )
}
