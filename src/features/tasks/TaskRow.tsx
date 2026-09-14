import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { CompleteChecklistDialog } from '@/features/tasks/CompleteChecklistDialog'
import { CompleteTaskDialog } from '@/features/tasks/CompleteTaskDialog'
import { cancelTask, startTask } from '@/features/tasks/api'
import { useAuthStore } from '@/stores/auth-store'
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
  // The server only lets the assignee start/complete/cancel a task — mirror
  // that here so the buttons don't invite a 403 for everyone else viewing
  // this equipment's task list.
  const isMine = task.assigned_to === currentUserId

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
        {task.task_library_id && (
          <div className="text-xs text-muted-foreground">
            {task.part_checks?.length ?? 0} part di checklist PM
          </div>
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
      <TableCell className="text-muted-foreground">{task.assignee_name ?? '-'}</TableCell>
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
        {isMine && task.status === 'pending' && (
          <Button size="sm" variant="outline" onClick={() => startMutation.mutate()}>
            Mulai
          </Button>
        )}
        {isMine && task.status === 'in_progress' && task.task_library_id && (
          <CompleteChecklistDialog task={task} invalidateKey={invalidateKey} />
        )}
        {isMine && task.status === 'in_progress' && !task.task_library_id && (
          <CompleteTaskDialog task={task} invalidateKey={invalidateKey} />
        )}
        {isMine && (task.status === 'pending' || task.status === 'in_progress') && (
          <Button size="sm" variant="outline" onClick={() => cancelMutation.mutate()}>
            Batal
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}
