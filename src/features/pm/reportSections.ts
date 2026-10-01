import type { MaintenanceReportSection } from '@/features/pm/MaintenanceReportPrintSection'
import { diffInDays } from '@/lib/dates'
import type { Task } from '@/types/tasks'

export type ReportPeriod = 'weekly' | 'monthly'

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

/**
 * Groups tasks into one section per week of the report period — a monthly
 * report's "Minggu ke-N" sub-headings; a weekly report's period is a single
 * week, so it collapses to one section with no heading. Shared by the
 * authenticated report builder (MaintenanceReportView) and its QR
 * Validator's digital twin (MaintenanceReportScanPage) so both lay out a
 * monthly report identically.
 */
export function buildReportSections(tasks: Task[], period: ReportPeriod, fromKey: string): MaintenanceReportSection[] {
  if (period === 'weekly') {
    return [{ tasks }]
  }

  const byWeek = new Map<number, Task[]>()
  for (const task of tasks) {
    if (!task.due_date) continue
    const weekIndex = Math.max(0, Math.floor(diffInDays(fromKey, task.due_date.slice(0, 10)) / 7))
    const bucket = byWeek.get(weekIndex) ?? []
    bucket.push(task)
    byWeek.set(weekIndex, bucket)
  }

  const [fy, fm, fd] = fromKey.split('-').map(Number)
  return Array.from(byWeek.entries())
    .sort(([a], [b]) => a - b)
    .map(([weekIndex, weekTasks]) => {
      const weekStart = new Date(fy, fm - 1, fd + weekIndex * 7)
      const weekEnd = new Date(fy, fm - 1, fd + weekIndex * 7 + 6)
      return {
        heading: `Minggu ke-${weekIndex + 1} (${weekStart.toLocaleDateString('id-ID', { dateStyle: 'medium' })} – ${weekEnd.toLocaleDateString('id-ID', { dateStyle: 'medium' })})`,
        tasks: weekTasks,
      }
    })
}
