import { Gauge } from '@/features/dashboard/Gauge'
import type { PmVsFailureCost } from '@/features/dashboard/api'

const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

/**
 * "Sebaran Cost PM vs Failure" (tahun yang dipilih di dashboard) — same
 * semicircle gauge as Inventory Health/Maintenance Performance. PM=success,
 * Failure=destructive follows Gauge's own "status color" convention (the
 * same good/bad mapping Maintenance Performance uses for on-time/late) —
 * more spend on planned work vs reactive failure is the healthier pattern.
 */
export function PmVsFailureCostChart({ pm_cost, failure_cost, year }: PmVsFailureCost & { year: number }) {
  const pmCost = Number(pm_cost)
  const failureCost = Number(failure_cost)
  const total = pmCost + failureCost

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada biaya PM atau failure tercatat tahun {year}.</p>
  }

  const pmPercent = Math.round((pmCost / total) * 100)
  const segments = [
    { key: 'pm', label: 'PM', value: pmCost, colorVar: 'var(--success)' },
    { key: 'failure', label: 'Failure', value: failureCost, colorVar: 'var(--destructive)' },
  ]

  return (
    <div className="flex flex-col items-center gap-3">
      <Gauge segments={segments} primaryValue={`${pmPercent}%`} primaryLabel="biaya PM" />
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-sm">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.colorVar }} />
            {s.label} <span className="font-medium text-foreground">{currencyFormatter.format(s.value)}</span>
          </span>
        ))}
        <span className="basis-full text-center text-xs text-muted-foreground">Biaya part keluar, tahun {year}</span>
      </div>
    </div>
  )
}
