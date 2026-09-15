import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/Breadcrumb'
import { EquipmentPartFormDialog } from '@/features/equipment-parts/EquipmentPartFormDialog'
import { fetchEquipmentParts, removeEquipmentPart } from '@/features/equipment-parts/api'
import { fetchEquipment } from '@/features/equipment/api'
import { PartInstallationFormDialog } from '@/features/part-installations/PartInstallationFormDialog'
import { fetchPartInstallations, removePartInstallation } from '@/features/part-installations/api'
import { SendToRepairDialog } from '@/features/part-repairs/SendToRepairDialog'
import { TaskLibraryList } from '@/features/task-libraries/TaskLibraryList'
import { TaskFormDialog } from '@/features/tasks/TaskFormDialog'
import { TaskRow } from '@/features/tasks/TaskRow'
import { fetchTasksForEquipment } from '@/features/tasks/api'
import { WorkOrderFormDialog } from '@/features/work-orders/WorkOrderFormDialog'
import { fetchWorkOrders, generateTaskFromWorkOrder } from '@/features/work-orders/api'
import { useCanManage, useCanManageEngineering } from '@/stores/use-has-role'
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
  const canManageBom = useCanManageEngineering()
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

      <TaskLibraryList equipmentId={equipmentId} />

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
          {canManageBom && (
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
                {canManageBom && <TableHead className="text-right">Aksi</TableHead>}
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
                  {canManageBom && (
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
                <TableHead>Unit</TableHead>
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
                    {installation.part_unit_id ? (
                      <Link to={`/part-units/${installation.part_unit_id}`} className="hover:underline">
                        Unit {installation.unit_code}
                      </Link>
                    ) : (
                      '-'
                    )}
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
                              : 'success'
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
                    <TableCell className="flex justify-end gap-2">
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
                      {!installation.is_active && installation.part_unit_id && (
                        <SendToRepairDialog
                          partUnitId={installation.part_unit_id}
                          partInstallationId={installation.id}
                          invalidateKeys={[['part-installations', equipmentId]]}
                          trigger={
                            <Button variant="outline" size="sm">
                              Kirim ke Perbaikan
                            </Button>
                          }
                        />
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
