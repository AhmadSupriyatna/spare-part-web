import { Gauge } from '@/features/dashboard/Gauge'
import type { MaintenancePerformance } from '@/features/dashboard/api'

/** "% WO selesai tepat waktu vs terlambat" (6 bulan terakhir) — same semicircle gauge as Inventory Health, two segments. */
export function MaintenancePerformanceChart({ on_time_count, late_count }: MaintenancePerformance) {
  const total = on_time_count + late_count

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada WO selesai dalam 6 bulan terakhir.</p>
  }

  const onTimePercent = Math.round((on_time_count / total) * 100)
  const segments = [
    { key: 'on_time', label: 'Tepat Waktu', value: on_time_count, colorVar: 'var(--success)' },
    { key: 'late', label: 'Terlambat', value: late_count, colorVar: 'var(--destructive)' },
  ]

  return (
    <div className="flex flex-col items-center gap-3">
      <Gauge segments={segments} primaryValue={`${onTimePercent}%`} primaryLabel="tepat waktu" />
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-sm">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.colorVar }} />
            {s.label} <span className="font-medium text-foreground tabular-nums">{s.value}</span>
          </span>
        ))}
        <span className="basis-full text-center text-xs text-muted-foreground">WO selesai, 6 bulan terakhir</span>
      </div>
    </div>
  )
}
