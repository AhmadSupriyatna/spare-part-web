import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Printer } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { taskSource, taskSourceLabel } from '@/features/pm/taskColors'
import { RescheduleTaskDialog } from '@/features/pm/RescheduleTaskDialog'
import { cancelTask } from '@/features/tasks/api'
import type { Task, TaskStatus } from '@/types/tasks'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

interface TaskDetailSheetProps {
  task: Task | null
  onOpenChange: (open: boolean) => void
}

/**
 * Push-drawer for a PM task clicked on the calendar. WOs are no longer
 * handed to a specific person from here — Engineer/Supervisor pick a WO up
 * themselves by pressing Mulai in the Workspace, so "Ditugaskan ke" just
 * reflects whoever has started working it (or "Belum dikerjakan").
 *
 * Reschedule/Batalkan are only offered for a Task Library-sourced task
 * (taskSource(task) === 'library') and only while it's still pending — per
 * request, not extended to Part Lifetime or Breakdown tasks even though the
 * backend itself would allow rescheduling the former (see
 * RescheduleTaskRequest): those have their own management flows elsewhere.
 */
export function TaskDetailSheet({ task, onOpenChange }: TaskDetailSheetProps) {
  const queryClient = useQueryClient()
  const [reschedulingTask, setReschedulingTask] = useState<Task | null>(null)
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)

  const cancelMutation = useMutation({
    mutationFn: () => cancelTask(task!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-tasks'] })
      toast.success('Tugas berhasil dibatalkan.')
      setConfirmCancelOpen(false)
      onOpenChange(false)
    },
    onError: () => toast.error('Gagal membatalkan tugas.'),
  })

  const canManageSchedule = !!task && taskSource(task) === 'library' && task.status === 'pending'

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
            <div className="scroll-thin flex flex-1 flex-col gap-4 overflow-y-auto p-4">
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
                  <p className="font-medium">{task.assignee_name ?? 'Belum dikerjakan'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ditutup / Selesai</p>
                  <p className="font-medium">
                    {task.completed_at
                      ? new Date(task.completed_at).toLocaleDateString('id-ID', { dateStyle: 'long' })
                      : '-'}
                  </p>
                </div>
              </div>

              {task.description && (
                <div>
                  <p className="text-xs text-muted-foreground">Deskripsi</p>
                  <p className="text-sm">{task.description}</p>
                </div>
              )}

              {(!task.part_checks || task.part_checks.length === 0) && task.part_name && (
                <div>
                  <p className="text-xs text-muted-foreground">Part</p>
                  <p className="text-sm font-medium">
                    {task.part_name}
                    {task.item_master_no && (
                      <span className="ml-1 font-mono text-xs text-muted-foreground">({task.item_master_no})</span>
                    )}
                  </p>
                  {task.quantity_used != null && <p className="text-xs text-muted-foreground">Qty: {task.quantity_used}</p>}
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

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link to={`/pm/tasks/${task.id}/print`} />}
                >
                  <Printer />
                  Cetak Checklist
                </Button>
                {canManageSchedule && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setReschedulingTask(task)}>
                      <CalendarClock />
                      Reschedule
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmCancelOpen(true)}>
                      Batalkan Tugas
                    </Button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>

      <RescheduleTaskDialog task={reschedulingTask} onOpenChange={(open) => !open && setReschedulingTask(null)} />

      <AlertDialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan tugas ini?</AlertDialogTitle>
            <AlertDialogDescription>
              "{task?.title}" akan ditandai dibatalkan dan tidak lagi muncul sebagai pekerjaan terjadwal. Tindakan ini
              tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tidak Jadi</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? 'Membatalkan...' : 'Ya, Batalkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}
