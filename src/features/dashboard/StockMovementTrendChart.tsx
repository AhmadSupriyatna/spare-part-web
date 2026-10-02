import type { StockMovementTrendPoint } from '@/features/dashboard/api'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function monthLabel(month: string): string {
  const [, m] = month.split('-')
  return MONTH_LABELS[Number(m) - 1] ?? month
}

/**
 * "Tren Keluar-Masuk Stok" — horizontal grouped bars (in_qty success,
 * out_qty destructive), one row per month, value printed right at the end
 * of each bar instead of relying on hover/title — reads at a glance even in
 * a compact 1/4-width card.
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

      <div className="flex max-h-52 flex-col gap-1 overflow-y-auto pr-1">
        {data.map((d) => (
          <div key={d.month} className="flex items-center gap-1.5">
            <span className="w-6 shrink-0 text-right text-[9px] text-muted-foreground">{monthLabel(d.month)}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-success"
                    style={{ width: `${d.in_qty > 0 ? Math.max((d.in_qty / maxQty) * 100, 4) : 0}%` }}
                  />
                </div>
                <span className="w-7 shrink-0 text-right text-[9px] tabular-nums text-muted-foreground">{d.in_qty}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-destructive"
                    style={{ width: `${d.out_qty > 0 ? Math.max((d.out_qty / maxQty) * 100, 4) : 0}%` }}
                  />
                </div>
                <span className="w-7 shrink-0 text-right text-[9px] tabular-nums text-muted-foreground">{d.out_qty}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
