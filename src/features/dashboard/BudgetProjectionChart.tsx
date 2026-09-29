import type { BudgetProjectionRow } from '@/features/dashboard/api'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

function monthLabel(month: string): string {
  const [, m] = month.split('-')
  return MONTH_LABELS[Number(m) - 1] ?? month
}

const WIDTH = 600
const HEIGHT = 160
const PAD_X = 8
const PAD_Y = 10

/**
 * "Proyeksi Biaya" — Rencana (chart-1) vs Realisasi (chart-2) cumulative
 * spend, one shared Rupiah axis (never dual-axis — both series are the same
 * unit). Two thin (2px) lines, a legend since there are 2 series, and a
 * hover title per point in place of a full crosshair layer, matching the
 * hover affordance level already used by every other hand-rolled chart in
 * this app (the heatmap/bar charts use native title tooltips, not a custom
 * crosshair).
 */
export function BudgetProjectionChart({ rows, plannedTotal }: { rows: BudgetProjectionRow[]; plannedTotal: string }) {
  if (Number(plannedTotal) === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada Budget untuk tahun ini — proyeksi baru muncul setelah Budget dibuat di menu Budget.
      </p>
    )
  }

  const values = rows.flatMap((r) => [Number(r.planned_cumulative), r.actual_cumulative != null ? Number(r.actual_cumulative) : null]).filter((v): v is number => v !== null)
  const max = Math.max(1, ...values)

  const x = (i: number) => PAD_X + (i / (rows.length - 1)) * (WIDTH - PAD_X * 2)
  const y = (v: number) => HEIGHT - PAD_Y - (v / max) * (HEIGHT - PAD_Y * 2)

  const plannedPoints = rows.map((r, i) => [x(i), y(Number(r.planned_cumulative))] as const)
  const actualRows = rows.filter((r) => r.actual_cumulative != null)
  const actualPoints = actualRows.map((r) => [x(rows.indexOf(r)), y(Number(r.actual_cumulative))] as const)

  const toPath = (points: readonly (readonly [number, number])[]) => points.map((p) => p.join(',')).join(' ')

  const lastActual = actualRows.at(-1)
  const lastPlannedAtNow = lastActual ? rows[rows.indexOf(lastActual)] : null
  const isOverBudget = lastActual && lastPlannedAtNow && Number(lastActual.actual_cumulative) > Number(lastPlannedAtNow.planned_cumulative)

  return (
    <div className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-40 w-full" preserveAspectRatio="none">
        <polyline points={toPath(plannedPoints)} fill="none" stroke="var(--chart-1)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <polyline points={toPath(actualPoints)} fill="none" stroke="var(--chart-2)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        {rows.map((r, i) => (
          <circle key={`p-${r.month}`} cx={x(i)} cy={y(Number(r.planned_cumulative))} r={3} fill="var(--chart-1)">
            <title>{`Rencana ${monthLabel(r.month)}: ${currencyFormatter.format(Number(r.planned_cumulative))}`}</title>
          </circle>
        ))}
        {actualRows.map((r) => (
          <circle key={`a-${r.month}`} cx={x(rows.indexOf(r))} cy={y(Number(r.actual_cumulative))} r={3} fill="var(--chart-2)">
            <title>{`Realisasi ${monthLabel(r.month)}: ${currencyFormatter.format(Number(r.actual_cumulative))}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        {rows.map((r) => (
          <span key={r.month}>{monthLabel(r.month)}</span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: 'var(--chart-1)' }} />
          <span className="text-muted-foreground">Rencana</span>
          <span className="font-medium tabular-nums">{currencyFormatter.format(Number(plannedTotal))}</span>
        </div>
        {lastActual && (
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: 'var(--chart-2)' }} />
            <span className="text-muted-foreground">Realisasi s/d bulan ini</span>
            <span className={isOverBudget ? 'font-medium text-destructive' : 'font-medium'}>
              {currencyFormatter.format(Number(lastActual.actual_cumulative))}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
