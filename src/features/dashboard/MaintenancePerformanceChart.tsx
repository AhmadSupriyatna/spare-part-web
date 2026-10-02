import { AmbientSignalBar } from '@/features/dashboard/AmbientSignalBar'
import type { MaintenancePerformance } from '@/features/dashboard/api'

/** "% WO selesai tepat waktu vs terlambat" (6 bulan terakhir) — same ambient signal bar as Inventory Health. */
export function MaintenancePerformanceChart({ on_time_count, late_count }: MaintenancePerformance) {
  const total = on_time_count + late_count
  const onTimePercent = total > 0 ? Math.round((on_time_count / total) * 100) : 0
  const glowColorVar = late_count > 0 ? 'var(--destructive)' : 'var(--success)'

  return (
    <AmbientSignalBar
      segments={[
        { key: 'on_time', label: 'Tepat Waktu', value: on_time_count, colorVar: 'var(--success)' },
        { key: 'late', label: 'Terlambat', value: late_count, colorVar: 'var(--destructive)' },
      ]}
      primaryValue={`${onTimePercent}%`}
      primaryLabel="tepat waktu"
      glowColorVar={glowColorVar}
      emptyMessage="Belum ada WO selesai dalam 6 bulan terakhir."
      footnote="WO selesai, 6 bulan terakhir"
    />
  )
}
