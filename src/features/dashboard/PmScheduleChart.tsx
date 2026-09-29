import { cn } from '@/lib/utils'
import type { Task } from '@/types/tasks'

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * "PM Schedule" — open (Pending/InProgress) tasks bucketed into "Terlambat"
 * (destructive — a status color, not a series) plus the next 6 weeks
 * (primary), one bar per bucket. Status color is reserved for the overdue
 * bucket only; every upcoming-week bar stays the neutral brand hue since
 * "due soon" isn't itself a status.
 */
export function PmScheduleChart({ tasks }: { tasks: Task[] }) {
  const openTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress')
  const overdueCount = openTasks.filter((t) => t.is_overdue).length
  const weekStart0 = startOfWeek(new Date())

  const weeks = Array.from({ length: 6 }, (_, i) => {
    const start = new Date(weekStart0)
    start.setDate(start.getDate() + i * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    const count = openTasks.filter((t) => {
      if (t.is_overdue || !t.due_date) return false
      const due = new Date(t.due_date)
      return due >= start && due < end
    }).length
    return { label: i === 0 ? 'Minggu Ini' : `+${i}mgg`, count }
  })

  const bars = [{ label: 'Terlambat', count: overdueCount, overdue: true }, ...weeks.map((w) => ({ ...w, overdue: false }))]
  const max = Math.max(1, ...bars.map((b) => b.count))
  const total = bars.reduce((sum, b) => sum + b.count, 0)

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Tidak ada PM yang sedang terjadwal atau terlambat.</p>
  }

  return (
    <div className="flex h-28 items-end gap-1.5">
      {bars.map((b) => (
        <div key={b.label} className="flex flex-1 flex-col items-center gap-0.5">
          <span className="text-[10px] font-medium tabular-nums text-foreground">{b.count > 0 ? b.count : ''}</span>
          <div className="flex h-16 w-full items-end" title={`${b.label}: ${b.count} PM`}>
            <div
              className={cn('w-full rounded-t', b.count === 0 ? 'bg-muted' : b.overdue ? 'bg-destructive' : 'bg-primary')}
              style={{ height: `${b.count > 0 ? Math.max((b.count / max) * 100, 6) : 3}%` }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground">{b.label}</span>
        </div>
      ))}
    </div>
  )
}
