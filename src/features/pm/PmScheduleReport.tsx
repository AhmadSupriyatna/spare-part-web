import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fetchLines } from '@/features/lines/api'
import { taskSource, taskSourceLabel } from '@/features/pm/taskColors'
import { fetchPmTasksForBranch } from '@/features/tasks/api'
import { fetchCompanySetting } from '@/features/settings/api'
import { useAuthStore } from '@/stores/auth-store'
import { useBranchStore } from '@/stores/branch-store'
import type { Task, TaskStatus } from '@/types/tasks'
import { EmptyState } from '@/components/EmptyState'
import { QueryErrorState } from '@/components/QueryErrorState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

const MONTHS = Array.from({ length: 12 }, (_, index) => index)

const statusLabels: Record<TaskStatus, string> = {
  pending: 'Rencana',
  in_progress: 'Dikerjakan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

function currentYear(): number {
  return new Date().getFullYear()
}

function scheduledMonth(task: Task): number | null {
  if (!task.due_date) return null
  const dueDate = new Date(`${task.due_date.slice(0, 10)}T00:00:00`)
  return Number.isNaN(dueDate.getTime()) ? null : dueDate.getMonth()
}

function scheduledDay(task: Task): string {
  return task.due_date ? task.due_date.slice(8, 10) : ''
}

export function PmScheduleReport() {
  const branchId = useBranchStore((state) => state.activeBranchId)
  const branchName = useAuthStore(
    (state) => state.user?.branches.find((branch) => branch.id === branchId)?.name,
  )
  const [yearInput, setYearInput] = useState(String(currentYear()))
  const parsedYear = Number(yearInput)
  const year = Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100 ? parsedYear : currentYear()

  const {
    data: tasks,
    isLoading: tasksLoading,
    isError: tasksError,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ['pm-tasks', branchId],
    queryFn: () => fetchPmTasksForBranch(branchId!),
    enabled: branchId !== null,
  })

  const {
    data: lines,
    isLoading: linesLoading,
    isError: linesError,
    refetch: refetchLines,
  } = useQuery({
    queryKey: ['lines', branchId],
    queryFn: () => fetchLines(branchId!),
    enabled: branchId !== null,
  })

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  const tasksByLineAndMonth = useMemo(() => {
    const grouped = new Map<number, Map<number, Task[]>>()

    for (const task of tasks ?? []) {
      if (task.line_id == null || task.due_date?.slice(0, 4) !== String(year)) continue
      if (taskSource(task) === 'breakdown') continue

      const month = scheduledMonth(task)
      if (month === null) continue

      const byMonth = grouped.get(task.line_id) ?? new Map<number, Task[]>()
      byMonth.set(month, [...(byMonth.get(month) ?? []), task])
      grouped.set(task.line_id, byMonth)
    }

    for (const byMonth of grouped.values()) {
      for (const [month, monthTasks] of byMonth) {
        byMonth.set(
          month,
          monthTasks.sort((left, right) => {
            const dayOrder = (left.due_date ?? '').localeCompare(right.due_date ?? '')
            return dayOrder || left.title.localeCompare(right.title, 'id')
          }),
        )
      }
    }

    return grouped
  }, [tasks, year])

  if (!branchId) {
    return <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
  }

  if (tasksLoading || linesLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  if (tasksError) {
    return <QueryErrorState onRetry={() => void refetchTasks()} title="Gagal memuat jadwal PM" />
  }

  if (linesError) {
    return <QueryErrorState onRetry={() => void refetchLines()} title="Gagal memuat daftar Line" />
  }

  const lineRows = lines ?? []
  const includedTaskCount = [...tasksByLineAndMonth.values()].reduce(
    (total, byMonth) => total + [...byMonth.values()].reduce((monthTotal, monthTasks) => monthTotal + monthTasks.length, 0),
    0,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div className="flex flex-col gap-2">
          <Label htmlFor="pm-schedule-year">Tahun</Label>
          <Input
            id="pm-schedule-year"
            type="number"
            min={2000}
            max={2100}
            value={yearInput}
            onChange={(event) => setYearInput(event.target.value)}
            className="w-32"
          />
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer />
          Cetak Jadwal PM
        </Button>
      </div>

      <section id="pm-schedule-report" className="text-neutral-900">
        <style>{`
          @media print {
            @page { size: landscape; margin: 10mm; }
            body * { visibility: hidden; }
            #pm-schedule-report, #pm-schedule-report * { visibility: visible; }
            #pm-schedule-report { position: absolute; inset: 0; width: 100%; }
            #pm-schedule-report thead { display: table-header-group; }
            #pm-schedule-report tr { break-inside: avoid; }
          }
        `}</style>

        <header className="mb-4 flex items-center justify-between gap-4 border-b-2 border-amber-400 pb-3">
          <div className="flex items-center gap-3">
            {companySetting?.logo_url ? (
              <img src={companySetting.logo_url} alt="" className="h-10 w-auto object-contain" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded border border-dashed text-[9px] text-neutral-400">
                Logo
              </div>
            )}
            <div>
              <p className="font-semibold">{companySetting?.name ?? 'Nama Perusahaan'}</p>
              <p className="text-xs text-neutral-500">{branchName ?? '-'}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold uppercase">Jadwal PM Tahunan per Line</h2>
            <p className="text-xs text-neutral-500">Tahun {year} · {includedTaskCount} Work Order</p>
          </div>
        </header>

        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-neutral-600">
          {(['pending', 'in_progress', 'completed', 'cancelled'] as const).map((status) => (
            <span key={status} className="flex items-center gap-1">
              <span className={`size-2 rounded-full ${statusDotClass(status)}`} />
              {statusLabels[status]}
            </span>
          ))}
        </div>

        {lineRows.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Belum ada Line" description="Plant ini belum memiliki Line." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] table-fixed border-collapse text-[9px] leading-tight print:min-w-0">
              <colgroup>
                <col className="w-36 print:w-28" />
                {MONTHS.map((month) => <col key={month} />)}
              </colgroup>
              <thead>
                <tr className="border-y-2 border-neutral-800 bg-neutral-100 text-left font-semibold">
                  <th className="p-1.5">Line</th>
                  {MONTHS.map((month) => (
                    <th key={month} className="border-l border-neutral-300 p-1 text-center">
                      {new Date(year, month, 1).toLocaleDateString('id-ID', { month: 'long' })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineRows.map((line) => {
                  const byMonth = tasksByLineAndMonth.get(line.id)
                  return (
                    <tr key={line.id} className="border-b border-neutral-400 align-top">
                      <th scope="row" className="bg-neutral-50 p-1.5 text-left font-semibold">
                        <span className="block">{line.code}</span>
                        <span className="mt-0.5 block font-normal text-neutral-600">{line.name}</span>
                      </th>
                      {MONTHS.map((month) => {
                        const monthTasks = byMonth?.get(month) ?? []
                        return (
                          <td key={month} className="border-l border-neutral-300 p-1">
                            {monthTasks.length === 0 ? (
                              <span className="text-neutral-300">—</span>
                            ) : (
                              <ul className="flex flex-col gap-1">
                                {monthTasks.map((task) => (
                                  <li key={task.id} className="border-b border-dotted border-neutral-300 pb-1 last:border-0">
                                    <span className="font-semibold">{scheduledDay(task)} · </span>
                                    <span>{task.title}</span>
                                    <span className={`mt-0.5 block ${statusTextClass(task.status)}`}>
                                      {taskSourceLabel[taskSource(task)]} · {statusLabels[task.status]}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function statusDotClass(status: TaskStatus): string {
  if (status === 'completed') return 'bg-emerald-600'
  if (status === 'in_progress') return 'bg-amber-500'
  if (status === 'cancelled') return 'bg-red-600'
  return 'bg-slate-500'
}

function statusTextClass(status: TaskStatus): string {
  if (status === 'completed') return 'text-emerald-700'
  if (status === 'in_progress') return 'text-amber-700'
  if (status === 'cancelled') return 'text-red-700'
  return 'text-slate-600'
}
