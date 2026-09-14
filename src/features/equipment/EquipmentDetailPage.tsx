import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/Breadcrumb'
import { EquipmentPartFormDialog } from '@/features/equipment-parts/EquipmentPartFormDialog'
import { fetchEquipmentParts, removeEquipmentPart } from '@/features/equipment-parts/api'
import { fetchEquipment } from '@/features/equipment/api'
import { PartInstallationFormDialog } from '@/features/part-installations/PartInstallationFormDialog'
import { fetchPartInstallations, removePartInstallation } from '@/features/part-installations/api'
import { ScheduleTaskLibraryDialog } from '@/features/task-libraries/ScheduleTaskLibraryDialog'
import { TaskLibraryFormDialog } from '@/features/task-libraries/TaskLibraryFormDialog'
import { TaskLibraryPartFormDialog } from '@/features/task-libraries/TaskLibraryPartFormDialog'
import {
  deleteTaskLibrary,
  fetchTaskLibrariesForEquipment,
  removeTaskLibraryPart,
} from '@/features/task-libraries/api'
import { TaskFormDialog } from '@/features/tasks/TaskFormDialog'
import { TaskRow } from '@/features/tasks/TaskRow'
import { fetchTasksForEquipment } from '@/features/tasks/api'
import { WorkOrderFormDialog } from '@/features/work-orders/WorkOrderFormDialog'
import { fetchWorkOrders, generateTaskFromWorkOrder } from '@/features/work-orders/api'
import { useCanManage } from '@/stores/use-has-role'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const scheduleLabels: Record<string, string> = {
  calendar: 'Kalender',
  runtime: 'Jam Operasi',
  unscheduled: 'Tidak Terjadwal',
}

export function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const equipmentId = Number(id)
  const canManage = useCanManage()
  const queryClient = useQueryClient()

  const { data: equipment } = useQuery({
    queryKey: ['equipment-detail', equipmentId],
    queryFn: () => fetchEquipment(equipmentId),
  })

  const { data: workOrders, isLoading: workOrdersLoading } = useQuery({
    queryKey: ['work-orders', equipmentId],
    queryFn: () => fetchWorkOrders(equipmentId),
  })

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', equipmentId],
    queryFn: () => fetchTasksForEquipment(equipmentId),
  })

  const generateMutation = useMutation({
    mutationFn: generateTaskFromWorkOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', equipmentId] })
      toast.success('Tugas berhasil dibuat dari work order.')
    },
  })

  const { data: equipmentParts, isLoading: equipmentPartsLoading } = useQuery({
    queryKey: ['equipment-parts', equipmentId],
    queryFn: () => fetchEquipmentParts(equipmentId),
  })

  const removeEquipmentPartMutation = useMutation({
    mutationFn: removeEquipmentPart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-parts', equipmentId] })
      toast.success('Part berhasil dihapus dari BOM.')
    },
  })

  const { data: installations, isLoading: installationsLoading } = useQuery({
    queryKey: ['part-installations', equipmentId],
    queryFn: () => fetchPartInstallations(equipmentId),
  })

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

  const removeInstallationMutation = useMutation({
    mutationFn: removePartInstallation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-installations', equipmentId] })
      toast.success('Part berhasil dilepas.')
    },
  })

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Breadcrumb
          segments={[
            { label: 'Line Produksi', to: '/lines' },
            ...(equipment
              ? [
                  { label: equipment.line_name ?? 'Line', to: `/lines?line=${equipment.line_id}` },
                  {
                    label: equipment.machine_name ?? 'Mesin',
                    to: `/lines?line=${equipment.line_id}&machine=${equipment.machine_id}`,
                  },
                ]
              : []),
            { label: equipment?.name ?? 'Equipment' },
          ]}
        />
        <h1 className="mt-1 text-2xl font-semibold">{equipment?.name ?? 'Equipment'}</h1>
        <p className="font-mono text-sm text-muted-foreground">{equipment?.code}</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Work Order</h2>
          {canManage && (
            <WorkOrderFormDialog equipmentId={equipmentId} trigger={<Button size="sm">Tambah Work Order</Button>} />
          )}
        </div>
        {workOrdersLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : workOrders?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada work order untuk equipment ini.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Jenis Jadwal</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Part</TableHead>
                {canManage && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders?.map((wo) => (
                <TableRow key={wo.id}>
                  <TableCell className="font-medium">{wo.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{scheduleLabels[wo.schedule_type]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {wo.interval_days ? `${wo.interval_days} hari` : null}
                    {wo.interval_hours ? `${wo.interval_hours} jam operasi` : null}
                    {!wo.interval_days && !wo.interval_hours ? '-' : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{wo.part_name ?? '-'}</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateMutation.mutate(wo.id)}
                        disabled={generateMutation.isPending}
                      >
                        Buat Tugas
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Task Library (PM)</h2>
          {canManage && (
            <TaskLibraryFormDialog
              equipmentId={equipmentId}
              trigger={<Button size="sm">Tambah Task Library</Button>}
            />
          )}
        </div>
        {taskLibrariesLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : taskLibraries?.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada resep kegiatan PM untuk equipment ini.
          </p>
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

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Tugas</h2>
          {canManage && (
            <TaskFormDialog equipmentId={equipmentId} trigger={<Button size="sm">Tambah Tugas</Button>} />
          )}
        </div>
        {tasksLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : tasks?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada tugas untuk equipment ini.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead>Ditugaskan ke</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks?.map((task) => (
                <TaskRow key={task.id} task={task} invalidateKey={['tasks', equipmentId]} />
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Bill of Material (BOM)</h2>
          {canManage && (
            <EquipmentPartFormDialog
              equipmentId={equipmentId}
              trigger={<Button size="sm">Tambah Part</Button>}
            />
          )}
        </div>
        {equipmentPartsLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : equipmentParts?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada part terdaftar sebagai komponen equipment ini.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead className="text-right">Jumlah Dibutuhkan</TableHead>
                <TableHead>Catatan</TableHead>
                {canManage && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipmentParts?.map((ep) => (
                <TableRow key={ep.id}>
                  <TableCell>
                    <Link to={`/parts/${ep.part_id}`} className="font-medium hover:underline">
                      {ep.part_name ?? `Part #${ep.part_id}`}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">{ep.quantity_required ?? '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{ep.notes ?? '-'}</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Hapus part dari BOM"
                              title="Hapus part dari BOM"
                            />
                          }
                        >
                          <Trash2 />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus part ini dari BOM?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{ep.part_name ?? `Part #${ep.part_id}`}" tidak akan lagi terdaftar sebagai
                              komponen equipment ini.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeEquipmentPartMutation.mutate(ep.id)}>
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Riwayat Pemasangan Part</h2>
          {canManage && (
            <PartInstallationFormDialog
              equipmentId={equipmentId}
              trigger={<Button size="sm">Pasang Part</Button>}
            />
          )}
        </div>
        {installationsLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : installations?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada part yang tercatat terpasang di equipment ini.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead>Tanggal Pasang</TableHead>
                <TableHead className="text-right">Usia</TableHead>
                <TableHead className="text-right">Pemakaian</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {installations?.map((installation) => (
                <TableRow key={installation.id}>
                  <TableCell>
                    <Link to={`/parts/${installation.part_id}`} className="font-medium hover:underline">
                      {installation.part_name}
                    </Link>
                    <p className="font-mono text-xs text-muted-foreground">{installation.item_master_no}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(installation.installed_at).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {installation.age_in_days} hari
                  </TableCell>
                  <TableCell className="text-right">
                    {installation.percent_used != null ? (
                      <Badge
                        variant={
                          installation.percent_used >= 100
                            ? 'destructive'
                            : installation.percent_used >= 80
                              ? 'warning'
                              : 'outline'
                        }
                      >
                        {Math.round(installation.percent_used)}%
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {installation.is_active ? (
                      <Badge variant="success">Terpasang</Badge>
                    ) : (
                      <Badge variant="secondary">Dilepas</Badge>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      {installation.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeInstallationMutation.mutate(installation.id)}
                          disabled={removeInstallationMutation.isPending}
                        >
                          Lepas
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
