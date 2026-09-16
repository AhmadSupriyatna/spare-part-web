import { Printer } from 'lucide-react'
import { Link } from 'react-router'
import type { Task, TaskStatus } from '@/types/tasks'
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
 * Read-focused push-drawer for a PM task clicked on the calendar — Sheet
 * registers with the global sheet-stack automatically, so the page behind
 * it pushes over rather than being covered, same as every other drawer.
 */
export function TaskDetailSheet({ task, onOpenChange }: TaskDetailSheetProps) {
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
                <Badge variant={task.task_library_id != null ? 'default' : 'warning'}>
                  {task.task_library_id != null ? 'Dari Task Library' : 'Dari Part Lifetime'}
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
                  <p className="font-medium">{task.assignee_name ?? '-'}</p>
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
