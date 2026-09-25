import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Layers } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  createMaintenanceWorkOrder,
  fetchMaintenanceWorkOrders,
  fetchTasksNeedingPlanning,
  markMaintenanceWorkOrderReady,
} from '@/features/tasks/api'
import type { MaintenanceWorkOrder, MaintenanceWorkOrderStatus, Task } from '@/types/tasks'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'

const woStatusLabel: Record<MaintenanceWorkOrderStatus, string> = {
  planning: 'Planning',
  ready: 'Siap',
  in_progress: 'Dikerjakan',
  completed: 'Selesai',
}

const woStatusVariant: Record<MaintenanceWorkOrderStatus, 'secondary' | 'default' | 'warning' | 'success'> = {
  planning: 'secondary',
  ready: 'default',
  in_progress: 'warning',
  completed: 'success',
}

function errorMessage(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
}

function groupByLine(tasks: Task[]): [string, Task[]][] {
  const groups = new Map<string, Task[]>()
  for (const task of tasks) {
    const key = task.line_name ?? 'Tanpa Line'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(task)
  }
  return Array.from(groups.entries())
}

/**
 * Phase 3B Step 4 — the PM planning layer, as its own tab alongside
 * Kalender/WO/Repair Part/Maintenance History rather than folded into the
 * calendar: lets the planner see every ungrouped Task (left column, grouped
 * by Line — the same grouping dimension the backend uses to denormalize a
 * new WO's line_id/planned_date), select several, and group them into one
 * WO; the right column shows every existing WO and lets a Planning-status
 * one be marked Ready. Tasks already inside a WO, or completed, simply
 * don't appear on the left any more — that's the "clearly distinguish"
 * requirement, handled by not showing them here rather than a busier
 * combined view.
 */
export function PmPlanningView({ branchId }: { branchId: number }) {
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const { data: needingPlanning, isLoading: needingLoading } = useQuery({
    queryKey: ['tasks-needing-planning', branchId],
    queryFn: () => fetchTasksNeedingPlanning(branchId),
  })

  const { data: workOrders, isLoading: workOrdersLoading } = useQuery({
    queryKey: ['maintenance-work-orders', branchId],
    queryFn: () => fetchMaintenanceWorkOrders(branchId),
  })

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['tasks-needing-planning', branchId] })
    queryClient.invalidateQueries({ queryKey: ['maintenance-work-orders', branchId] })
    queryClient.invalidateQueries({ queryKey: ['pm-tasks', branchId] })
  }

  const createMutation = useMutation({
    mutationFn: () => createMaintenanceWorkOrder(branchId, Array.from(selectedIds)),
    onSuccess: () => {
      invalidateAll()
      toast.success('WO berhasil dibuat dari tugas terpilih.')
      setSelectedIds(new Set())
    },
    onError: (error: unknown) => toast.error(errorMessage(error, 'Gagal membuat WO.')),
  })

  const markReadyMutation = useMutation({
    mutationFn: (id: number) => markMaintenanceWorkOrderReady(id),
    onSuccess: () => {
      invalidateAll()
      toast.success('WO ditandai siap.')
    },
    onError: (error: unknown) => toast.error(errorMessage(error, 'Gagal menandai WO siap.')),
  })

  function toggle(taskId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  const grouped = useMemo(() => groupByLine(needingPlanning ?? []), [needingPlanning])

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-3 rounded-lg border p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Perlu Perencanaan</h2>
          <Button
            size="sm"
            disabled={selectedIds.size === 0 || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? 'Membuat...' : `Buat WO (${selectedIds.size})`}
          </Button>
        </div>

        {needingLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !needingPlanning || needingPlanning.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Tidak ada tugas menunggu"
            description="Semua tugas yang belum dimulai sudah masuk ke sebuah WO."
          />
        ) : (
          <div className="flex max-h-[32rem] flex-col gap-4 overflow-y-auto">
            {grouped.map(([lineName, tasks]) => (
              <div key={lineName} className="flex flex-col gap-1.5">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{lineName}</p>
                <div className="flex flex-col gap-1.5">
                  {tasks.map((task) => (
                    <label
                      key={task.id}
                      className="flex cursor-pointer items-start gap-2 rounded-md border p-2 hover:bg-muted"
                    >
                      <Checkbox
                        checked={selectedIds.has(task.id)}
                        onCheckedChange={() => toggle(task.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{task.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {task.equipment_name} ·{' '}
                          {task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID') : 'Tanpa tanggal'}
                        </p>
                      </div>
                      {task.is_overdue && (
                        <Badge variant="destructive" className="shrink-0">
                          Terlambat
                        </Badge>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-3">
        <h2 className="text-sm font-semibold">Daftar WO</h2>

        {workOrdersLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : !workOrders || workOrders.length === 0 ? (
          <EmptyState icon={Layers} title="Belum ada WO" description="Kelompokkan tugas di sebelah kiri untuk membuat WO pertama." />
        ) : (
          <div className="flex max-h-[32rem] flex-col gap-2 overflow-y-auto">
            {workOrders.map((workOrder: MaintenanceWorkOrder) => (
              <div key={workOrder.id} className="flex flex-col gap-2 rounded-md border p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      WO #{workOrder.id}
                      {workOrder.line_name && ` · ${workOrder.line_name}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {workOrder.planned_date
                        ? new Date(workOrder.planned_date).toLocaleDateString('id-ID')
                        : 'Tanggal campuran'}{' '}
                      · {workOrder.task_count ?? workOrder.tasks?.length ?? 0} tugas
                    </p>
                  </div>
                  <Badge variant={woStatusVariant[workOrder.status]} className="shrink-0">
                    {woStatusLabel[workOrder.status]}
                  </Badge>
                </div>

                {workOrder.tasks && workOrder.tasks.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {workOrder.tasks.map((task) => (
                      <li
                        key={task.id}
                        className="flex items-center justify-between gap-2 rounded bg-muted/50 px-2 py-1 text-xs"
                      >
                        <span className="truncate">{task.title}</span>
                        <Badge variant={task.status === 'completed' ? 'success' : 'secondary'} className="shrink-0">
                          {task.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}

                {workOrder.status === 'planning' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="self-start"
                    disabled={markReadyMutation.isPending}
                    onClick={() => markReadyMutation.mutate(workOrder.id)}
                  >
                    Tandai Siap
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
