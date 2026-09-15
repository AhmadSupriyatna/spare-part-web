import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ScheduleTaskLibraryDialog } from '@/features/task-libraries/ScheduleTaskLibraryDialog'
import { TaskLibraryFormDialog } from '@/features/task-libraries/TaskLibraryFormDialog'
import { TaskLibraryPartFormDialog } from '@/features/task-libraries/TaskLibraryPartFormDialog'
import {
  deleteTaskLibrary,
  fetchTaskLibrariesForEquipment,
  removeTaskLibraryPart,
} from '@/features/task-libraries/api'
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
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface TaskLibraryListProps {
  equipmentId: number
  title?: string
  addLabel?: string
}

/**
 * The full Task Library (PM recipe) management block for one equipment —
 * create/edit/delete the recipe, manage its checklist parts, and schedule it
 * onto the PM calendar. Shared between EquipmentDetailPage and the
 * Line > Mesin > Equipment browser on TaskLibrariesPage so both stay in sync
 * without duplicating the markup.
 */
export function TaskLibraryList({
  equipmentId,
  title = 'Task Library (PM)',
  addLabel = 'Tambah Task Library',
}: TaskLibraryListProps) {
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

  const removeTaskLibraryPartMutation = useMutation({
    mutationFn: removeTaskLibraryPart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-libraries', equipmentId] })
      toast.success('Part berhasil dihapus dari checklist.')
    },
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{title}</h2>
        {canManage && (
          <TaskLibraryFormDialog equipmentId={equipmentId} trigger={<Button size="sm">{addLabel}</Button>} />
        )}
      </div>
      {taskLibrariesLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : taskLibraries?.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada resep kegiatan PM untuk equipment ini.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {taskLibraries?.map((library) => (
            <div key={library.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{library.title}</p>
                  {library.description && (
                    <p className="text-sm text-muted-foreground">{library.description}</p>
                  )}
                </div>
                {canManage && (
                  <div className="flex shrink-0 gap-1">
                    <ScheduleTaskLibraryDialog
                      libraries={[library]}
                      defaultLibraryId={library.id}
                      invalidateKeys={[['tasks', equipmentId]]}
                      trigger={<Button size="sm">Jadwalkan</Button>}
                    />
                    <TaskLibraryFormDialog
                      equipmentId={equipmentId}
                      library={library}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Ubah Task Library"
                          title="Ubah Task Library"
                        >
                          <Pencil />
                        </Button>
                      }
                    />
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Hapus Task Library"
                            title="Hapus Task Library"
                          />
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
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Checklist Part
                  </p>
                  {canManage && (
                    <TaskLibraryPartFormDialog
                      taskLibraryId={library.id}
                      equipmentId={equipmentId}
                      trigger={
                        <Button variant="ghost" size="xs">
                          + Part
                        </Button>
                      }
                    />
                  )}
                </div>
                {library.parts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada part di checklist ini.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {library.parts.map((part) => (
                      <li
                        key={part.id}
                        className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-sm"
                      >
                        <span>
                          {part.part_name}{' '}
                          <span className="font-mono text-xs text-muted-foreground">
                            ({part.item_master_no})
                          </span>{' '}
                          × {part.quantity_required}
                        </span>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Hapus dari checklist"
                            title="Hapus dari checklist"
                            onClick={() => removeTaskLibraryPartMutation.mutate(part.id)}
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
