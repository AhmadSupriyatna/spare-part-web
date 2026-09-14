import { useQuery } from '@tanstack/react-query'
import { CalendarClock, Printer } from 'lucide-react'
import { Link } from 'react-router'
import { fetchPmTasksForBranch } from '@/features/tasks/api'
import { useBranchStore } from '@/stores/branch-store'
import type { TaskStatus } from '@/types/tasks'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const statusLabels: Record<TaskStatus, string> = {
  pending: 'Belum Mulai',
  in_progress: 'Sedang Dikerjakan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

const statusVariants: Record<TaskStatus, 'secondary' | 'default' | 'success' | 'destructive'> = {
  pending: 'secondary',
  in_progress: 'default',
  completed: 'success',
  cancelled: 'destructive',
}

export function PmLedgerPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['pm-tasks', activeBranchId],
    queryFn: () => fetchPmTasksForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih cabang terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Ledger WO PM"
        description="Riwayat semua WO PM Schedule yang pernah dijadwalkan di cabang ini."
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : tasks?.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Belum ada WO PM yang dijadwalkan"
          description="Jadwalkan kegiatan dari Task Library lewat Kalender PM untuk mulai mengisi ledger ini."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kegiatan</TableHead>
              <TableHead>Equipment / Line</TableHead>
              <TableHead>Ditugaskan ke</TableHead>
              <TableHead>Tanggal Jadwal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks?.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {task.equipment_name}
                  <div className="text-xs">
                    {task.machine_name} · {task.line_name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{task.assignee_name ?? '-'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID') : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariants[task.status]}>
                    {task.is_overdue && task.status !== 'completed' && task.status !== 'cancelled'
                      ? 'Terlambat'
                      : statusLabels[task.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    nativeButton={false}
                    aria-label="Cetak checklist"
                    title="Cetak checklist"
                    render={<Link to={`/pm/tasks/${task.id}/print`} />}
                  >
                    <Printer />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
