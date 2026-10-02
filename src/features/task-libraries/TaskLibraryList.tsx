import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { TaskLibraryFormDialog } from '@/features/task-libraries/TaskLibraryFormDialog'
import { deleteTaskLibrary, fetchTaskLibrariesForEquipment } from '@/features/task-libraries/api'
import { useCanManageEngineering } from '@/stores/use-has-role'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function intervalLabel(scheduleType: string | null, intervalDays: number | null, intervalHours: number | null): string | null {
  if (scheduleType === 'calendar' && intervalDays) {
    if (intervalDays === 7) return 'Mingguan'
    if (intervalDays === 30) return 'Bulanan'
    return `Setiap ${intervalDays} hari`
  }
  if (scheduleType === 'runtime' && intervalHours) return `Setiap ${intervalHours} jam operasi`
  return null
}

/**
 * The full Task Library (PM recipe) management block for one equipment —
 * list of recipes plus create/edit (via one unified drawer that also owns
 * the parts checklist) and scheduling. Used by the Line/Sub System browser
 * in TaskLibraryBrowser.tsx (the "Library" view on MaintenancePage).
 */
export function TaskLibraryList({ equipmentId, title = 'Task Library (PM)' }: { equipmentId: number; title?: string }) {
  const canManage = useCanManageEngineering()
  const queryClient = useQueryClient()

  const { data: taskLibraries, isLoading: taskLibrariesLoading } = useQuery({
    queryKey: ['task-libraries', equipmentId],
    queryFn: () => fetchTaskLibrariesForEquipment(equipmentId),
  })

  const deleteTaskLibraryMutation = useMutation({
    mutationFn: deleteTaskLibrary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-libraries', equipmentId] })
      toast.success('Task Library berhasil dihapus.')
    },
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{title}</h2>
        {canManage && (
          <TaskLibraryFormDialog equipmentId={equipmentId} trigger={<Button size="sm">Tambah Task</Button>} />
        )}
      </div>
      {taskLibrariesLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : taskLibraries?.length === 0 ? (
        <EmptyState title="Belum ada resep kegiatan PM untuk equipment ini." />
      ) : (
        <div className="flex flex-col gap-3">
          {taskLibraries?.map((library) => {
            const interval = intervalLabel(library.schedule_type, library.interval_days, library.interval_hours)
            return (
              <div key={library.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{library.code}</span>
                      {interval && <span className="text-xs text-muted-foreground">· {interval}</span>}
                      {library.estimated_duration_minutes && (
                        <span className="text-xs text-muted-foreground">· ~{library.estimated_duration_minutes} menit</span>
                      )}
                    </div>
                    <p className="font-medium">{library.title}</p>
                    {library.description && (
                      <p className="text-sm text-muted-foreground">{library.description}</p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 gap-1">
                      <TaskLibraryFormDialog
                        equipmentId={equipmentId}
                        library={library}
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label="Ubah Task Library" title="Ubah Task Library">
                            <Pencil />
                          </Button>
                        }
                      />
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" aria-label="Hapus Task Library" title="Hapus Task Library" />
                          }
                        >
                          <Trash2 />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Task Library ini?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{library.title}" beserta checklist part-nya akan dihapus permanen. WO yang
                              sudah pernah dijadwalkan dari sini tidak ikut terhapus.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteTaskLibraryMutation.mutate(library.id)}>
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-col gap-1">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Checklist Part</p>
                  {library.parts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada part di checklist ini.</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {library.parts.map((part) => (
                        <li key={part.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-sm">
                          <span>
                            {part.part_name}{' '}
                            <span className="font-mono text-xs text-muted-foreground">({part.item_master_no})</span>
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">× {part.quantity_required}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
