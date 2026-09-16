import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { fetchNationalHolidays, fetchTaskRescheduleHistory } from '@/features/pm/api'
import { PartLifetimePanel } from '@/features/pm/PartLifetimePanel'
import { RescheduleReasonDialog } from '@/features/pm/RescheduleReasonDialog'
import { taskChipVariant } from '@/features/pm/taskColors'
import { TaskDetailSheet } from '@/features/pm/TaskDetailSheet'
import { WoListView } from '@/features/pm/WoListView'
import { ScheduleTaskLibraryDialog } from '@/features/task-libraries/ScheduleTaskLibraryDialog'
import { fetchTaskLibrariesForBranch } from '@/features/task-libraries/api'
import { fetchPmTasksForBranch, rescheduleTask } from '@/features/tasks/api'
import { useBranchStore } from '@/stores/branch-store'
import { cn } from '@/lib/utils'
import type { Task } from '@/types/tasks'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function diffInDays(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / msPerDay)
}

export function PmCalendarPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const queryClient = useQueryClient()
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [draggingTask, setDraggingTask] = useState<Task | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const [pendingReschedule, setPendingReschedule] = useState<{ task: Task; newDate: string; diffDays: number } | null>(
    null,
  )
  const [detailTask, setDetailTask] = useState<Task | null>(null)

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

  const libraryIntervalById = useMemo(() => {
    const map = new Map<number, number | null>()
    libraries?.forEach((library) => map.set(library.id, library.interval_days))
    return map
  }, [libraries])

  function scheduleTag(task: Task): 'W' | 'M' | null {
    if (task.task_library_id == null) return null
    const days = libraryIntervalById.get(task.task_library_id)
    if (days === 7) return 'W'
    if (days === 30) return 'M'
    return null
  }

  const { data: rescheduleHistory } = useQuery({
    queryKey: ['task-reschedules', activeBranchId],
    queryFn: () => fetchTaskRescheduleHistory(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const { data: holidays } = useQuery({
    queryKey: ['national-holidays', monthCursor.getFullYear()],
    queryFn: () => fetchNationalHolidays(monthCursor.getFullYear()),
    staleTime: Infinity,
    retry: 1,
  })

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, dueDate, reason }: { id: number; dueDate: string; reason?: string }) =>
      rescheduleTask(id, dueDate, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-tasks', activeBranchId] })
      queryClient.invalidateQueries({ queryKey: ['task-reschedules', activeBranchId] })
      toast.success('Jadwal berhasil digeser.')
      setPendingReschedule(null)
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menggeser jadwal.'
      toast.error(message)
    },
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

  function handleDrop(dateKey: string) {
    setDragOverKey(null)
    if (!draggingTask || !draggingTask.due_date) return
    const currentKey = toDateKey(new Date(draggingTask.due_date))
    if (currentKey === dateKey) return

    const diffDays = Math.abs(diffInDays(currentKey, dateKey))
    if (diffDays > 7) {
      setPendingReschedule({ task: draggingTask, newDate: dateKey, diffDays })
    } else {
      rescheduleMutation.mutate({ id: draggingTask.id, dueDate: dateKey })
    }
  }

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih cabang terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="PM Schedule"
        description="WO otomatis muncul dari Task Library (biru), Part Lifetime yang tersisa 20% (kuning), dan breakdown (merah). Seret kartu untuk menggeser tanggal — pergeseran lebih dari 7 hari perlu alasan."
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-md border p-1">
          <Button
            variant={view === 'calendar' ? 'default' : 'ghost'}
            size="icon-sm"
            aria-label="Tampilan Kalender"
            title="Kalender"
            onClick={() => setView('calendar')}
          >
            <CalendarDays />
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="icon-sm"
            aria-label="Tampilan List WO"
            title="List WO"
            onClick={() => setView('list')}
          >
            <List />
          </Button>
        </div>

        {view === 'calendar' && (
          <div className="flex items-center gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded-full bg-primary" /> Task Library
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded-full bg-warning" /> Part Lifetime
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded-full bg-destructive" /> Breakdown
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded-full bg-success" /> Selesai
              </span>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="icon-sm" aria-label="Bulan sebelumnya" onClick={() => shiftMonth(-1)}>
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMonthCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
              >
                Hari Ini
              </Button>
              <Button variant="outline" size="icon-sm" aria-label="Bulan berikutnya" onClick={() => shiftMonth(1)}>
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </div>

      {view === 'list' ? (
        <WoListView tasks={tasks} isLoading={tasksLoading} onSelect={setDetailTask} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[65fr_35fr]">
          <div className="flex flex-col gap-4">
            <p className="text-lg font-medium">
              {monthCursor.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </p>

            {tasksLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border bg-border">
                {WEEKDAYS.map((day, i) => (
                  <div
                    key={day}
                    className={cn(
                      'bg-muted px-1.5 py-1 text-center text-[11px] font-medium text-muted-foreground',
                      i === 0 && 'text-destructive',
                    )}
                  >
                    {day}
                  </div>
                ))}
                {cells.map((date) => {
                  const key = toDateKey(date)
                  const isCurrentMonth = date.getMonth() === monthCursor.getMonth()
                  const dayTasks = tasksByDate.get(key) ?? []
                  const isSunday = date.getDay() === 0
                  const holidayName = holidays?.[key]
                  const isSpecialDay = isSunday || !!holidayName

                  return (
                    <div
                      key={key}
                      title={holidayName}
                      className={cn(
                        'flex min-h-16 flex-col gap-0.5 bg-background p-1 transition-colors',
                        !isCurrentMonth && 'bg-muted/30',
                        isSpecialDay && 'bg-destructive/5',
                        dragOverKey === key &&
                          'bg-primary/10 outline-2 -outline-offset-2 outline-primary/50 outline-dashed',
                      )}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                        setDragOverKey(key)
                      }}
                      onDragLeave={() => setDragOverKey((prev) => (prev === key ? null : prev))}
                      onDrop={(e) => {
                        e.preventDefault()
                        handleDrop(key)
                      }}
                    >
                      <span
                        className={cn(
                          'flex size-4 items-center justify-center rounded-full text-[11px] tabular-nums',
                          key === today && 'bg-primary text-primary-foreground',
                          !isCurrentMonth && 'text-muted-foreground/60',
                          isSpecialDay && isCurrentMonth && key !== today && 'text-destructive',
                        )}
                      >
                        {date.getDate()}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        {dayTasks.slice(0, 2).map((task) => {
                          const tag = scheduleTag(task)
                          return (
                            <button
                              key={task.id}
                              type="button"
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', String(task.id))
                                e.dataTransfer.effectAllowed = 'move'
                                setDraggingTask(task)
                              }}
                              onDragEnd={() => setDraggingTask(null)}
                              onClick={() => setDetailTask(task)}
                              className="block w-full cursor-grab truncate rounded text-left text-[10px] leading-tight active:cursor-grabbing"
                            >
                              <Badge variant={taskChipVariant(task)} className="max-w-full px-1 py-0">
                                {tag && <span className="font-bold">{tag}</span>}
                                <span className="truncate">{task.title}</span>
                              </Badge>
                            </button>
                          )
                        })}
                        {dayTasks.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">+{dayTasks.length - 2} lagi</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium">Riwayat Reschedule</h2>
              {!rescheduleHistory || rescheduleHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada jadwal yang pernah digeser.</p>
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>WO</TableHead>
                        <TableHead>Dari</TableHead>
                        <TableHead>Ke</TableHead>
                        <TableHead>Alasan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rescheduleHistory.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">{entry.task_title}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {entry.previous_due_date
                              ? new Date(entry.previous_due_date).toLocaleDateString('id-ID', { dateStyle: 'medium' })
                              : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(entry.new_due_date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                          </TableCell>
                          <TableCell
                            className="max-w-[180px] truncate text-muted-foreground"
                            title={entry.reason ?? ''}
                          >
                            {entry.reason ?? '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          <PartLifetimePanel branchId={activeBranchId} />
        </div>
      )}

      <TaskDetailSheet task={detailTask} onOpenChange={(open) => !open && setDetailTask(null)} />

      <RescheduleReasonDialog
        pending={pendingReschedule}
        isSubmitting={rescheduleMutation.isPending}
        onCancel={() => setPendingReschedule(null)}
        onConfirm={(reason) => {
          if (!pendingReschedule) return
          rescheduleMutation.mutate({
            id: pendingReschedule.task.id,
            dueDate: pendingReschedule.newDate,
            reason,
          })
        }}
      />
    </div>
  )
}
