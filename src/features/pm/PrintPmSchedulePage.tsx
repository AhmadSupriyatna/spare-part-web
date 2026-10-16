import { useQuery } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocation } from 'react-router'
import { fetchLines } from '@/features/lines/api'
import { fetchPmTasksForBranch } from '@/features/tasks/api'
import { fetchCompanySetting } from '@/features/settings/api'
import { useAuthStore } from '@/stores/auth-store'
import { useBranchStore } from '@/stores/branch-store'
import type { Task, TaskStatus } from '@/types/tasks'
import { EmptyState } from '@/components/EmptyState'
import { PrintPageActions } from '@/components/PrintPageActions'
import { QueryErrorState } from '@/components/QueryErrorState'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

const ALL_LINES = 'all'
const OUTSIDE_LINE = 'outside'

const statusLabels: Record<TaskStatus, string> = {
  pending: 'Belum Mulai',
  in_progress: 'Sedang Dikerjakan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

function currentMonth(): string {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  if (!year || !monthNumber) return '-'
  return new Date(year, monthNumber - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

function formatDate(date: string | null): string {
  if (!date) return '-'
  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', { dateStyle: 'medium' })
}

function lineLabel(task: Task): string {
  if (task.line_id == null) return 'Luar Line'
  return [task.line_code, task.line_name].filter(Boolean).join(' — ') || 'Line tidak tersedia'
}

function statusVariant(status: TaskStatus): 'success' | 'secondary' | 'warning' | 'destructive' {
  if (status === 'completed') return 'success'
  if (status === 'in_progress') return 'warning'
  if (status === 'cancelled') return 'destructive'
  return 'secondary'
}

export function PrintPmSchedulePage() {
  const branchId = useBranchStore((state) => state.activeBranchId)
  const branchName = useAuthStore(
    (state) => state.user?.branches.find((branch) => branch.id === branchId)?.name,
  )
  const location = useLocation()
  const initialMonth = (location.state as { month?: string } | null)?.month
  const [month, setMonth] = useState(initialMonth ?? currentMonth())
  const [lineFilter, setLineFilter] = useState(ALL_LINES)

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

  const filteredTasks = useMemo(() => {
    return (tasks ?? [])
      .filter((task) => task.due_date?.slice(0, 7) === month)
      .filter((task) => {
        if (lineFilter === ALL_LINES) return true
        if (lineFilter === OUTSIDE_LINE) return task.line_id == null
        return task.line_id != null && String(task.line_id) === lineFilter
      })
      .sort((left, right) => {
        const dateOrder = (left.due_date ?? '').localeCompare(right.due_date ?? '')
        if (dateOrder !== 0) return dateOrder
        return lineLabel(left).localeCompare(lineLabel(right), 'id')
      })
  }, [lineFilter, month, tasks])

  const completedCount = filteredTasks.filter((task) => task.status === 'completed').length
  const inProgressCount = filteredTasks.filter((task) => task.status === 'in_progress').length
  const plannedCount = filteredTasks.filter((task) => task.status === 'pending').length
  const cancelledCount = filteredTasks.filter((task) => task.status === 'cancelled').length

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

  const selectedLineName =
    lineFilter === ALL_LINES
      ? 'Semua Line'
      : lineFilter === OUTSIDE_LINE
        ? 'Luar Line'
        : lines?.find((line) => String(line.id) === lineFilter)?.name ?? 'Line'

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 print:p-0">
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <div className="flex flex-col gap-2">
          <Label htmlFor="pm-schedule-month">Bulan</Label>
          <Input
            id="pm-schedule-month"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="w-48"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Line</Label>
          <Select value={lineFilter} onValueChange={(value) => value && setLineFilter(value)}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Pilih Line" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_LINES}>Semua Line</SelectItem>
              <SelectItem value={OUTSIDE_LINE}>Luar Line</SelectItem>
              {lines?.map((line) => (
                <SelectItem key={line.id} value={String(line.id)}>
                  {line.code} — {line.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <PrintPageActions printLabel="Cetak Jadwal PM" />

      <section id="pm-schedule-print-area" className="mx-auto w-full max-w-6xl text-neutral-900">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #pm-schedule-print-area, #pm-schedule-print-area * { visibility: visible; }
            #pm-schedule-print-area { position: absolute; inset: 0; max-width: none; padding: 20px; }
            #pm-schedule-print-area thead { display: table-header-group; }
            #pm-schedule-print-area tr { break-inside: avoid; }
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
            <h1 className="text-lg font-bold uppercase">Jadwal PM Bulanan</h1>
            <p className="text-xs text-neutral-500">
              Periode {monthLabel(month)} · {selectedLineName}
            </p>
          </div>
        </header>

        <div className="mb-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <p className="rounded border p-2">Total: <strong>{filteredTasks.length}</strong></p>
          <p className="rounded border p-2">Belum mulai: <strong>{plannedCount}</strong></p>
          <p className="rounded border p-2">Sedang dikerjakan: <strong>{inProgressCount}</strong></p>
          <p className="rounded border p-2">Selesai: <strong>{completedCount}</strong></p>
        </div>

        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Tidak ada jadwal PM"
            description={`Tidak ada Work Order terjadwal untuk ${selectedLineName} pada ${monthLabel(month)}.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-y-2 border-neutral-800 bg-neutral-100 text-left font-semibold">
                  <th className="p-2">Tgl. Rencana</th>
                  <th className="p-2">Line</th>
                  <th className="p-2">Mesin / Equipment</th>
                  <th className="p-2">Work Order</th>
                  <th className="p-2">PIC</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Tgl. Selesai</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="border-b border-neutral-300 align-top">
                    <td className="p-2 whitespace-nowrap">{formatDate(task.due_date)}</td>
                    <td className="p-2">{lineLabel(task)}</td>
                    <td className="p-2">
                      {task.machine_name ?? '-'}
                      <div className="text-neutral-500">{task.equipment_name ?? '-'}</div>
                    </td>
                    <td className="p-2 font-medium">{task.title}</td>
                    <td className="p-2">{task.assignee_name ?? '-'}</td>
                    <td className="p-2">
                      <Badge variant={statusVariant(task.status)}>{statusLabels[task.status]}</Badge>
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {task.status === 'completed' ? formatDate(task.completed_at) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {cancelledCount > 0 && (
          <p className="mt-3 text-xs text-neutral-500">
            Termasuk {cancelledCount} Work Order yang dibatalkan.
          </p>
        )}
      </section>
    </div>
  )
}
