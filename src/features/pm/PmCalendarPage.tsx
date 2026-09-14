import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ScheduleTaskLibraryDialog } from '@/features/task-libraries/ScheduleTaskLibraryDialog'
import { fetchTaskLibrariesForBranch } from '@/features/task-libraries/api'
import { fetchPmTasksForBranch } from '@/features/tasks/api'
import { useBranchStore } from '@/stores/branch-store'
import { cn } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types/tasks'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

const statusVariants: Record<TaskStatus, 'secondary' | 'default' | 'success' | 'destructive'> = {
  pending: 'secondary',
  in_progress: 'default',
  completed: 'success',
  cancelled: 'destructive',
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function PmCalendarPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['pm-tasks', activeBranchId],
    queryFn: () => fetchPmTasksForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const { data: libraries } = useQuery({
    queryKey: ['task-libraries', 'branch', activeBranchId],
    queryFn: () => fetchTaskLibrariesForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    tasks?.forEach((task) => {
      if (!task.due_date) return
      const key = toDateKey(new Date(task.due_date))
      map.set(key, [...(map.get(key) ?? []), task])
    })
    return map
  }, [tasks])

  const cells = useMemo(() => {
    const firstOfMonth = monthCursor
    const startOffset = firstOfMonth.getDay()
    const gridStart = new Date(firstOfMonth)
    gridStart.setDate(gridStart.getDate() - startOffset)

    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + i)
      return date
    })
  }, [monthCursor])

  const today = toDateKey(new Date())

  function shiftMonth(delta: number) {
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih cabang terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Kalender PM"
        description="Jadwalkan kegiatan dari Task Library ke tanggal tertentu — begitu dijadwalkan, otomatis jadi WO PM Schedule."
        action={
          libraries &&
          libraries.length > 0 && (
            <ScheduleTaskLibraryDialog
              libraries={libraries}
              invalidateKeys={[['pm-tasks', activeBranchId]]}
              trigger={
                <Button size="sm">
                  <Plus className="size-3.5" />
                  Jadwalkan
                </Button>
              }
            />
          )
        }
      />

      {libraries?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Belum ada Task Library di cabang ini — tambahkan dulu lewat halaman detail equipment (bagian
          "Task Library (PM)") sebelum bisa dijadwalkan ke kalender.
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-lg font-medium">
          {monthCursor.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
        </p>
        <div className="flex gap-1">
          <Button variant="outline" size="icon-sm" aria-label="Bulan sebelumnya" onClick={() => shiftMonth(-1)}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMonthCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
            Hari Ini
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Bulan berikutnya" onClick={() => shiftMonth(1)}>
            <ChevronRight />
          </Button>
        </div>
      </div>

      {tasksLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border bg-border">
          {WEEKDAYS.map((day) => (
            <div key={day} className="bg-muted px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
          {cells.map((date) => {
            const key = toDateKey(date)
            const isCurrentMonth = date.getMonth() === monthCursor.getMonth()
            const dayTasks = tasksByDate.get(key) ?? []

            return (
              <div
                key={key}
                className={cn(
                  'flex min-h-24 flex-col gap-1 bg-background p-1.5',
                  !isCurrentMonth && 'bg-muted/30',
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full text-xs tabular-nums',
                      key === today && 'bg-primary text-primary-foreground',
                      !isCurrentMonth && 'text-muted-foreground/60',
                    )}
                  >
                    {date.getDate()}
                  </span>
                  {libraries && libraries.length > 0 && (
                    <ScheduleTaskLibraryDialog
                      libraries={libraries}
                      defaultDate={key}
                      invalidateKeys={[['pm-tasks', activeBranchId]]}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Jadwalkan di tanggal ${date.getDate()}`}
                          title="Jadwalkan"
                        >
                          <Plus />
                        </Button>
                      }
                    />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <Link
                      key={task.id}
                      to={`/pm/tasks/${task.id}/print`}
                      className="block truncate rounded px-1 py-0.5 text-[11px] leading-tight hover:underline"
                    >
                      <Badge variant={statusVariants[task.status]} className="max-w-full">
                        <span className="truncate">{task.title}</span>
                      </Badge>
                    </Link>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[11px] text-muted-foreground">+{dayTasks.length - 3} lagi</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
