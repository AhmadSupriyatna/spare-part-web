import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, FileText, List, Plus, Wrench } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { fetchFp3RequestsForBranch, scheduleFp3Request, type Fp3Request } from '@/features/fp3/api'
import { FindingActionView } from '@/features/findings/FindingActionView'
import { MaintenanceHistoryView } from '@/features/maintenance-history/MaintenanceHistoryView'
import { fetchNationalHolidays, fetchTaskRescheduleHistory } from '@/features/pm/api'
import { MaintenanceReportView } from '@/features/pm/MaintenanceReportView'
import { RescheduleReasonDialog } from '@/features/pm/RescheduleReasonDialog'
import { taskChipVariant, taskSource } from '@/features/pm/taskColors'
import { TaskDetailSheet } from '@/features/pm/TaskDetailSheet'
import { UnscheduledWorkPanel } from '@/features/pm/UnscheduledWorkPanel'
import { WoListView } from '@/features/pm/WoListView'
import { RepairBoard } from '@/features/part-repairs/RepairBoard'
import { ScheduleTaskLibraryDialog } from '@/features/task-libraries/ScheduleTaskLibraryDialog'
import { fetchTaskLibrariesForBranch, scheduleTaskLibrary } from '@/features/task-libraries/api'
import { fetchPmTasksForBranch, rescheduleTask } from '@/features/tasks/api'
import { useBranchStore } from '@/stores/branch-store'
import { diffInDays, toDateKey } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { TaskLibrary } from '@/types/pm'
import type { Task } from '@/types/tasks'
import { PageHeader } from '@/components/PageHeader'
import { QueryErrorState } from '@/components/QueryErrorState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const VISIBLE_TASKS_PER_DAY = 3

type MaintenanceView = 'calendar' | 'list' | 'report' | 'repair' | 'history' | 'findings'

export function MaintenancePage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const view: MaintenanceView =
    tabParam === 'list' ||
    tabParam === 'report' ||
    tabParam === 'repair' ||
    tabParam === 'history' ||
    tabParam === 'findings'
      ? tabParam
      : 'calendar'
  function setView(next: MaintenanceView) {
    setSearchParams({ tab: next })
  }
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [draggingTask, setDraggingTask] = useState<Task | null>(null)
  const [draggingLibrary, setDraggingLibrary] = useState<TaskLibrary | null>(null)
  const [draggingFp3, setDraggingFp3] = useState<Fp3Request | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const [pendingReschedule, setPendingReschedule] = useState<{ task: Task; newDate: string; diffDays: number } | null>(
    null,
  )
  const [detailTask, setDetailTask] = useState<Task | null>(null)

  const {
    data: tasks,
    isLoading: tasksLoading,
    isError: tasksError,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ['pm-tasks', activeBranchId],
    queryFn: () => fetchPmTasksForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const { data: libraries } = useQuery({
    queryKey: ['task-libraries', 'branch', activeBranchId],
    queryFn: () => fetchTaskLibrariesForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const { data: fp3Requests, isLoading: fp3Loading } = useQuery({
    queryKey: ['fp3-requests', activeBranchId],
    queryFn: () => fetchFp3RequestsForBranch(activeBranchId!),
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

  const holidaysThisMonth = useMemo(() => {
    if (!holidays) return []
    const year = monthCursor.getFullYear()
    const month = monthCursor.getMonth() + 1
    return Object.entries(holidays)
      .filter(([dateStr]) => {
        const [y, m] = dateStr.split('-').map(Number)
        return y === year && m === month
      })
      .sort(([a], [b]) => (a < b ? -1 : 1))
  }, [holidays, monthCursor])

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

  const fp3ByDate = useMemo(() => {
    const map = new Map<string, Fp3Request[]>()
    fp3Requests?.forEach((fp3) => {
      if (!fp3.due_date) return
      const key = toDateKey(new Date(fp3.due_date))
      map.set(key, [...(map.get(key) ?? []), fp3])
    })
    return map
  }, [fp3Requests])

  const scheduleLibraryMutation = useMutation({
    mutationFn: ({ id, dueDate }: { id: number; dueDate: string }) => scheduleTaskLibrary(id, { due_date: dueDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-tasks', activeBranchId] })
      toast.success('Task manual berhasil dijadwalkan.')
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menjadwalkan task manual.'
      toast.error(message)
    },
  })

  const scheduleFp3Mutation = useMutation({
    mutationFn: ({ id, dueDate }: { id: number; dueDate: string }) => scheduleFp3Request(id, dueDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fp3-requests', activeBranchId] })
      toast.success('FP3 berhasil dijadwalkan.')
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menjadwalkan FP3.'
      toast.error(message)
    },
  })

  const cells = useMemo(() => {
    const firstOfMonth = monthCursor
    const jsDay = firstOfMonth.getDay() // 0 = Sunday
    const mondayOffset = (jsDay + 6) % 7
    const gridStart = new Date(firstOfMonth)
    gridStart.setDate(gridStart.getDate() - mondayOffset)

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

    if (draggingLibrary) {
      scheduleLibraryMutation.mutate({ id: draggingLibrary.id, dueDate: dateKey })
      setDraggingLibrary(null)
      return
    }

    if (draggingFp3) {
      scheduleFp3Mutation.mutate({ id: draggingFp3.id, dueDate: dateKey })
      setDraggingFp3(null)
      return
    }

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
    return <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        title="Maintenance"
        action={
          <div className="flex gap-1 rounded-md border p-1">
            <Button
              variant={view === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('calendar')}
            >
              <CalendarDays className="size-3.5" />
              Kalender
            </Button>
            <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setView('list')}>
              <List className="size-3.5" />
              WO
            </Button>
          <Button variant={view === 'report' ? 'default' : 'ghost'} size="sm" onClick={() => setView('report')}>
            <FileText className="size-3.5" />
            Laporan
          </Button>
          <Button variant={view === 'repair' ? 'default' : 'ghost'} size="sm" onClick={() => setView('repair')}>
            <Wrench className="size-3.5" />
            Repair Part
          </Button>
          {/* Maintenance History is no longer its own tab — merged into
              Repair Part as "Riwayat Perbaikan" (see RepairHistoryList),
              which answers the same "part apa, dilepas dari mana/kapan,
              diperbaiki kapan, biaya berapa, status sekarang, oleh siapa"
              questions this generic timeline used to. The old view stays
              fully wired (route/type/component below, API/backend
              untouched) as a dormant capability, reachable via
              ?tab=history, same treatment as Finding & Action below. */}
          {/* Finding & Action (Phase 2) is intentionally not a primary tab —
              Maintenance is replacement-only per the Phase 3 product
              decision. The feature stays fully wired (route/type/component
              below, API/backend untouched) as a dormant capability, reachable
              via ?tab=findings, without being surfaced in normal navigation. */}
          </div>
        }
      />

      {view === 'list' && <WoListView tasks={tasks} isLoading={tasksLoading} onSelect={setDetailTask} />}

      {view === 'report' && activeBranchId && <MaintenanceReportView branchId={activeBranchId} />}

      {view === 'repair' && <RepairBoard branchId={activeBranchId} />}

      {view === 'history' && <MaintenanceHistoryView branchId={activeBranchId} />}

      {view === 'findings' && <FindingActionView branchId={activeBranchId} />}

      {view === 'calendar' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[70fr_30fr]">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
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
                  <span className="size-2.5 rounded-full bg-chart-2" /> WO FP3
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2.5 rounded-full bg-success" /> Selesai
                </span>
              </div>
              <div className="flex items-center gap-2">
                {libraries && libraries.length > 0 && (
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
                )}
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
            </div>

            <p className="text-lg font-medium">
              {monthCursor.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </p>

            {tasksLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : tasksError ? (
              <QueryErrorState onRetry={() => refetchTasks()} title="Gagal memuat jadwal PM" />
            ) : (
              <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border bg-border">
                {WEEKDAYS.map((day, i) => (
                  <div
                    key={day}
                    className={cn(
                      'bg-muted px-1.5 py-1 text-center text-[11px] font-medium text-muted-foreground',
                      i === 6 && 'text-destructive',
                    )}
                  >
                    {day}
                  </div>
                ))}
                {cells.map((date) => {
                  const key = toDateKey(date)
                  const isCurrentMonth = date.getMonth() === monthCursor.getMonth()
                  const dayTasks = tasksByDate.get(key) ?? []
                  const dayFp3 = fp3ByDate.get(key) ?? []
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
                        {dayTasks.slice(0, VISIBLE_TASKS_PER_DAY).map((task) => {
                          const tag = scheduleTag(task)
                          const isBreakdown = taskSource(task) === 'breakdown'
                          return (
                            <button
                              key={task.id}
                              type="button"
                              draggable={!isBreakdown}
                              title={isBreakdown ? 'WO Breakdown tidak bisa dijadwal ulang dari kalender ini' : undefined}
                              onDragStart={(e) => {
                                if (isBreakdown) {
                                  e.preventDefault()
                                  return
                                }
                                e.dataTransfer.setData('text/plain', String(task.id))
                                e.dataTransfer.effectAllowed = 'move'
                                setDraggingTask(task)
                              }}
                              onDragEnd={() => setDraggingTask(null)}
                              onClick={() => setDetailTask(task)}
                              className={cn(
                                'block w-full truncate rounded text-left text-[10px] leading-tight',
                                isBreakdown ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
                              )}
                            >
                              <Badge variant={taskChipVariant(task)} className="max-w-full px-1 py-0">
                                {tag && <span className="font-bold">{tag}</span>}
                                <span className="truncate">{task.title}</span>
                              </Badge>
                            </button>
                          )
                        })}
                        {dayTasks.length > VISIBLE_TASKS_PER_DAY && (
                          <Popover>
                            <PopoverTrigger
                              render={
                                <button
                                  type="button"
                                  className="text-left text-[10px] text-muted-foreground hover:underline"
                                />
                              }
                            >
                              +{dayTasks.length - VISIBLE_TASKS_PER_DAY} lagi
                            </PopoverTrigger>
                            <PopoverContent side="right" align="start" className="w-56">
                              <div className="flex flex-col gap-1">
                                {dayTasks.map((task) => (
                                  <button
                                    key={task.id}
                                    type="button"
                                    onClick={() => setDetailTask(task)}
                                    className="rounded px-1 py-0.5 text-left"
                                  >
                                    <Badge variant={taskChipVariant(task)} className="max-w-full">
                                      <span className="truncate">{task.title}</span>
                                    </Badge>
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                        {dayFp3.slice(0, VISIBLE_TASKS_PER_DAY).map((fp3) => (
                          <Link
                            key={fp3.id}
                            to="/workspace"
                            title={`${fp3.code} — ${fp3.requester_name}: ${fp3.description}`}
                            className="block w-full truncate rounded text-left text-[10px] leading-tight"
                          >
                            <Badge
                              variant="outline"
                              className="max-w-full border-chart-2/40 bg-chart-2/15 px-1 py-0 text-chart-2"
                            >
                              <span className="truncate">{fp3.requester_name}</span>
                            </Badge>
                          </Link>
                        ))}
                        {dayFp3.length > VISIBLE_TASKS_PER_DAY && (
                          <Popover>
                            <PopoverTrigger
                              render={
                                <button
                                  type="button"
                                  className="text-left text-[10px] text-muted-foreground hover:underline"
                                />
                              }
                            >
                              +{dayFp3.length - VISIBLE_TASKS_PER_DAY} FP3 lagi
                            </PopoverTrigger>
                            <PopoverContent side="right" align="start" className="w-56">
                              <div className="flex flex-col gap-1">
                                {dayFp3.map((fp3) => (
                                  <Link
                                    key={fp3.id}
                                    to="/workspace"
                                    className="rounded px-1 py-0.5 text-left"
                                  >
                                    <Badge
                                      variant="outline"
                                      className="max-w-full border-chart-2/40 bg-chart-2/15 text-chart-2"
                                    >
                                      <span className="truncate">{fp3.requester_name}</span>
                                    </Badge>
                                  </Link>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {holidaysThisMonth.length > 0 && (
              <div className="flex flex-col gap-0.5">
                {holidaysThisMonth.map(([date, name]) => (
                  <p key={date} className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-destructive">
                      {new Date(date).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </span>
                    {' — '}
                    {name}
                  </p>
                ))}
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

          <UnscheduledWorkPanel
            libraries={libraries}
            fp3Requests={fp3Requests}
            isLoading={fp3Loading}
            onDragLibraryStart={setDraggingLibrary}
            onDragFp3Start={setDraggingFp3}
            onDragEnd={() => {
              setDraggingLibrary(null)
              setDraggingFp3(null)
            }}
          />
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
