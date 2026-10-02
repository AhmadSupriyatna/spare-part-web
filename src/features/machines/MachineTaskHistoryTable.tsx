import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { fetchMachineTaskHistory } from '@/features/machines/api'
import { taskChipVariant, taskSource, taskSourceLabel } from '@/features/pm/taskColors'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const statusLabels: Record<string, string> = {
  pending: 'Belum Mulai',
  in_progress: 'Sedang Dikerjakan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

/**
 * "Riwayat PM" — every Task this Machine's equipment has ever had, any
 * status or source (Task Library, Part Lifetime, Breakdown), paginated so
 * a long-lived Machine's history doesn't dump hundreds of rows at once.
 */
export function MachineTaskHistoryTable({ machineId }: { machineId: number }) {
  const [page, setPage] = useState(1)

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['machine-task-history', machineId, page],
    queryFn: () => fetchMachineTaskHistory(machineId, page),
    placeholderData: keepPreviousData,
  })

  if (isLoading) return <Skeleton className="h-48 w-full" />

  const tasks = data?.data ?? []

  if (page === 1 && tasks.length === 0) {
    return <EmptyState title="Belum ada riwayat PM untuk mesin ini." />
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Judul</TableHead>
              <TableHead>Equipment</TableHead>
              <TableHead>Sumber</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ditugaskan ke</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="text-muted-foreground">
                  {task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                </TableCell>
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell className="text-muted-foreground">{task.equipment_name ?? '-'}</TableCell>
                <TableCell className="text-muted-foreground">{taskSourceLabel[taskSource(task)]}</TableCell>
                <TableCell>
                  <Badge variant={taskChipVariant(task)}>
                    {task.is_overdue && task.status !== 'completed' && task.status !== 'cancelled'
                      ? 'Terlambat'
                      : (statusLabels[task.status] ?? task.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{task.assignee_name ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.last_page > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Halaman {data.meta.current_page} dari {data.meta.last_page} &middot; {data.meta.total} WO
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isPlaceholderData}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              <ChevronLeft />
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.meta.last_page || isPlaceholderData}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Berikutnya
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
