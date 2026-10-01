import { Gauge } from '@/features/dashboard/Gauge'

interface InventoryHealthGaugeProps {
  critical: number
  warning: number
  normal: number
}

/** "Inventory Health" — semicircle gauge reading the healthy (Normal) share of stock, with a small legend below carrying each segment's count/percentage, since color alone never carries identity here. */
export function InventoryHealthGauge({ critical, warning, normal }: InventoryHealthGaugeProps) {
  const total = critical + warning + normal

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada part dengan stok di plant ini.</p>
  }

  const healthyPercent = Math.round((normal / total) * 100)
  const segments = [
    { key: 'normal', label: 'Normal', value: normal, colorVar: 'var(--success)' },
    { key: 'warning', label: 'Peringatan', value: warning, colorVar: 'var(--warning)' },
    { key: 'critical', label: 'Kritis', value: critical, colorVar: 'var(--destructive)' },
  ]

  return (
    <div className="flex flex-col items-center gap-3">
      <Gauge segments={segments} primaryValue={`${healthyPercent}%`} primaryLabel="sehat" />
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-sm">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.colorVar }} />
            {s.label} <span className="font-medium text-foreground tabular-nums">{s.value}</span>
            <span className="text-xs">({Math.round((s.value / total) * 100)}%)</span>
          </span>
        ))}
      </div>
    </div>
  )
}
