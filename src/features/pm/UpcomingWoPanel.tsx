import { useMemo } from 'react'
import { CalendarClock } from 'lucide-react'
import { taskChipVariant, taskSource, taskSourceLabel } from '@/features/pm/taskColors'
import type { Task } from '@/types/tasks'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'

interface UpcomingWoPanelProps {
  tasks: Task[] | undefined
  isLoading: boolean
  onSelect: (task: Task) => void
}

const MAX_SHOWN = 30

/**
 * Compact list beside the PM calendar — every not-yet-due WO, nearest
 * first, so the planner sees what's coming without scrolling the calendar
 * grid. Replaces the old Part Lifetime monitoring panel in this slot: Life
 * Based tasks now auto-schedule themselves (PartLifetimeService) the moment
 * a part crosses the at-risk threshold, so they already show up here like
 * any other upcoming WO instead of needing a separate "at risk" list.
 */
export function UpcomingWoPanel({ tasks, isLoading, onSelect }: UpcomingWoPanelProps) {
  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return (tasks ?? [])
      .filter((task) => task.status === 'pending' && task.due_date && task.due_date >= today)
      .sort((a, b) => (a.due_date! < b.due_date! ? -1 : a.due_date! > b.due_date! ? 1 : 0))
      .slice(0, MAX_SHOWN)
  }, [tasks])

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div>
        <h2 className="text-sm font-medium">WO yang Akan Datang</h2>
        <p className="text-xs text-muted-foreground">Belum jatuh tempo, terdekat lebih dulu.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 w-full animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : upcoming.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Tidak ada" description="Tidak ada WO yang akan datang." />
      ) : (
        <div className="flex max-h-[32rem] flex-col gap-2 overflow-y-auto">
          {upcoming.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onSelect(task)}
              className="flex flex-col gap-1 rounded-md border p-2.5 text-left text-sm hover:bg-muted"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 truncate font-medium">{task.title}</span>
                <Badge variant={taskChipVariant(task)} className="shrink-0">
                  {taskSourceLabel[taskSource(task)]}
                </Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {task.equipment_name} · {task.machine_name} · {task.line_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(task.due_date!).toLocaleDateString('id-ID', { dateStyle: 'long' })}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
