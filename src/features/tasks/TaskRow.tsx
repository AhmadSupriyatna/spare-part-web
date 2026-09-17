import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { CompleteChecklistDialog } from '@/features/tasks/CompleteChecklistDialog'
import { CompleteTaskDialog } from '@/features/tasks/CompleteTaskDialog'
import { cancelTask, startTask } from '@/features/tasks/api'
import { useAuthStore } from '@/stores/auth-store'
import { useHasRole } from '@/stores/use-has-role'
import type { Task } from '@/types/tasks'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'

const statusLabels: Record<Task['status'], string> = {
  pending: 'Belum Mulai',
  in_progress: 'Sedang Dikerjakan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

interface TaskRowProps {
  task: Task
  invalidateKey: unknown[]
  showEquipment?: boolean
}

export function TaskRow({ task, invalidateKey }: TaskRowProps) {
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((state) => state.user?.id)
  const canClaim = useHasRole(['engineer', 'supervisor', 'superadmin'])
  // The server lets either the current claimant act, or — for an
  // unclaimed WO — any Engineer/Supervisor/Superadmin claim it by acting
  // on it (see TaskController::ensureCanWork()); mirror that here so the
  // buttons don't invite a 403 for someone who can't act on this row.
  const isMine = task.assigned_to === currentUserId
  const canAct = isMine || (task.assigned_to === null && canClaim)

  function reportError(error: unknown, fallback: string) {
    const message =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
    toast.error(message)
  }

  const startMutation = useMutation({
    mutationFn: () => startTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      toast.success('Tugas dimulai.')
    },
    onError: (error: unknown) => reportError(error, 'Gagal memulai tugas.'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      toast.success('Tugas dibatalkan.')
    },
    onError: (error: unknown) => reportError(error, 'Gagal membatalkan tugas.'),
  })

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{task.title}</div>
        {task.cause && <div className="text-xs text-muted-foreground">Penyebab: {task.cause}</div>}
        {task.part_stock_id && (
          <div className="text-xs text-muted-foreground">
            Part: {task.part_name ?? `#${task.part_stock_id}`}
            {task.quantity_used ? ` × ${task.quantity_used}` : ''}
          </div>
        )}
        {task.part_checks && task.part_checks.length > 0 && (
          <div className="text-xs text-muted-foreground">{task.part_checks.length} part di checklist PM</div>
        )}
      </TableCell>
      <TableCell>
        <Badge
          variant={
            task.status === 'completed'
              ? 'success'
              : task.status === 'cancelled'
                ? 'secondary'
                : task.is_overdue
                  ? 'destructive'
                  : 'secondary'
          }
        >
          {task.is_overdue && task.status !== 'completed' && task.status !== 'cancelled'
            ? 'Terlambat'
            : statusLabels[task.status]}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID') : '-'}
      </TableCell>
      <TableCell className="text-muted-foreground">{task.assignee_name ?? 'Belum diklaim'}</TableCell>
      <TableCell className="flex justify-end gap-2">
        {task.task_library_id && (
          <Button
            variant="ghost"
            size="icon-sm"
            nativeButton={false}
            aria-label="Cetak checklist WO"
            title="Cetak checklist WO"
            render={<Link to={`/pm/tasks/${task.id}/print`} />}
          >
            <Printer />
          </Button>
        )}
        {canAct && task.status === 'pending' && (
          <Button size="sm" variant="outline" onClick={() => startMutation.mutate()}>
            Mulai
          </Button>
        )}
        {canAct && task.status === 'in_progress' && task.part_checks && task.part_checks.length > 0 && (
          <CompleteChecklistDialog task={task} invalidateKey={invalidateKey} />
        )}
        {canAct &&
          task.status === 'in_progress' &&
          (!task.part_checks || task.part_checks.length === 0) && (
            <CompleteTaskDialog task={task} invalidateKey={invalidateKey} />
          )}
        {canAct && (task.status === 'pending' || task.status === 'in_progress') && (
          <Button size="sm" variant="outline" onClick={() => cancelMutation.mutate()}>
            Batal
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}
