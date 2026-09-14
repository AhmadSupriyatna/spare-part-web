import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CompleteTaskDialog } from '@/features/tasks/CompleteTaskDialog'
import { cancelTask, startTask } from '@/features/tasks/api'
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

  const startMutation = useMutation({
    mutationFn: () => startTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      toast.success('Tugas dimulai.')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      toast.success('Tugas dibatalkan.')
    },
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
        {task.status === 'pending' && (
          <Button size="sm" variant="outline" onClick={() => startMutation.mutate()}>
            Mulai
          </Button>
        )}
        {task.status === 'in_progress' && (
          <CompleteTaskDialog task={task} invalidateKey={invalidateKey} />
        )}
        {(task.status === 'pending' || task.status === 'in_progress') && (
          <Button size="sm" variant="outline" onClick={() => cancelMutation.mutate()}>
            Batal
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}
