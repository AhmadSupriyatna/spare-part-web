import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { taskSource, taskSourceLabel } from '@/features/pm/taskColors'
import { fetchUsers } from '@/features/users/api'
import { updateTask } from '@/features/tasks/api'
import { useCanManage } from '@/stores/use-has-role'
import type { Task, TaskStatus } from '@/types/tasks'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'

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

const UNASSIGNED_VALUE = 'unassigned'

interface TaskDetailSheetProps {
  task: Task | null
  branchId: number | null
  onOpenChange: (open: boolean) => void
}

/**
 * Push-drawer for a PM task clicked on the calendar. Mostly read-only, but
 * "Ditugaskan ke" is editable for Admin Spare Part/Superadmin (mirroring
 * the PUT /tasks/{task} role gate) — this is the only place an auto-
 * generated WO (Task Library/Part Lifetime schedules always start
 * unassigned, see PmSchedulingService) can actually be handed to someone,
 * which is what makes it show up in that person's "Tugas Saya".
 */
export function TaskDetailSheet({ task, branchId, onOpenChange }: TaskDetailSheetProps) {
  const canManage = useCanManage()
  const queryClient = useQueryClient()
  const [assignedTo, setAssignedTo] = useState<string>(UNASSIGNED_VALUE)

  useEffect(() => {
    setAssignedTo(task?.assigned_to ? String(task.assigned_to) : UNASSIGNED_VALUE)
  }, [task])

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchUsers(),
    enabled: canManage && !!task,
  })
  const assignableUsers = users?.filter((user) => user.roles.includes('engineer'))

  const assignMutation = useMutation({
    mutationFn: (value: string) =>
      updateTask(task!.id, { assigned_to: value === UNASSIGNED_VALUE ? null : Number(value) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-tasks', branchId] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'mine'] })
      toast.success('Penugasan berhasil diperbarui.')
    },
    onError: () => toast.error('Gagal mengubah penugasan.'),
  })

  return (
    <Sheet open={!!task} onOpenChange={onOpenChange} modal={false}>
      <SheetContent className="gap-0 p-0" showOverlay={false}>
        {task && (
          <>
            <div className="flex flex-col gap-1 border-b px-4 py-4 pr-10">
              <SheetTitle>{task.title}</SheetTitle>
              <SheetDescription>
                {task.equipment_name} · {task.machine_name} · {task.line_name}
              </SheetDescription>
            </div>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusVariants[task.status]}>{statusLabels[task.status]}</Badge>
                {task.is_overdue && task.status !== 'completed' && task.status !== 'cancelled' && (
                  <Badge variant="destructive">Terlambat</Badge>
                )}
                <Badge
                  variant={
                    taskSource(task) === 'library' ? 'default' : taskSource(task) === 'lifetime' ? 'warning' : 'destructive'
                  }
                >
                  {taskSourceLabel[taskSource(task)]}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Jatuh Tempo</p>
                  <p className="font-medium">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ditugaskan ke</p>
                  {canManage ? (
                    <Select
                      value={assignedTo}
                      onValueChange={(value) => {
                        const next = value ?? UNASSIGNED_VALUE
                        setAssignedTo(next)
                        assignMutation.mutate(next)
                      }}
                    >
                      <SelectTrigger size="sm" className="mt-0.5 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED_VALUE}>Belum ditugaskan</SelectItem>
                        {assignableUsers?.map((user) => (
                          <SelectItem key={user.id} value={String(user.id)}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium">{task.assignee_name ?? '-'}</p>
                  )}
                </div>
              </div>

              {task.description && (
                <div>
                  <p className="text-xs text-muted-foreground">Deskripsi</p>
                  <p className="text-sm">{task.description}</p>
                </div>
              )}

              {task.part_checks && task.part_checks.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-muted-foreground">Checklist Part</p>
                  <div className="flex flex-col gap-1.5">
                    {task.part_checks.map((check) => (
                      <div
                        key={check.id}
                        className="flex items-center justify-between rounded-md border px-2.5 py-1.5 text-sm"
                      >
                        <span>{check.part_name ?? `Part #${check.part_id}`}</span>
                        {check.is_replaced === null ? (
                          <span className="text-xs text-muted-foreground">Belum diputuskan</span>
                        ) : check.is_replaced ? (
                          <Badge variant="success">Diganti</Badge>
                        ) : (
                          <Badge variant="secondary">Tidak Diganti</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="self-start"
                nativeButton={false}
                render={<Link to={`/pm/tasks/${task.id}/print`} />}
              >
                <Printer />
                Cetak Checklist
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
