import { InlineSignalStrip } from '@/features/dashboard/InlineSignalStrip'
import type { MaintenancePerformance } from '@/features/dashboard/api'

/** "% WO selesai tepat waktu vs terlambat" (tahun yang dipilih di dashboard) — same thin inline strip as Inventory Health. */
export function MaintenancePerformanceChart({ on_time_count, late_count, year }: MaintenancePerformance & { year: number }) {
  const total = on_time_count + late_count
  const onTimePercent = total > 0 ? Math.round((on_time_count / total) * 100) : 0

  return (
    <InlineSignalStrip
      label="Maintenance Performance"
      segments={[
        { key: 'Tepat Waktu', value: on_time_count, colorVar: 'var(--success)' },
        { key: 'Terlambat', value: late_count, colorVar: 'var(--destructive)' },
      ]}
      primaryValue={`${onTimePercent}%`}
      primarySuffix="tepat waktu"
      emptyMessage={`Belum ada WO selesai tahun ${year}.`}
    />
  )
}
