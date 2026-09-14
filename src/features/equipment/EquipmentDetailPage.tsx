import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { fetchEquipment } from '@/features/equipment/api'
import { TaskFormDialog } from '@/features/tasks/TaskFormDialog'
import { TaskRow } from '@/features/tasks/TaskRow'
import { fetchTasksForEquipment } from '@/features/tasks/api'
import { WorkOrderFormDialog } from '@/features/work-orders/WorkOrderFormDialog'
import { fetchWorkOrders, generateTaskFromWorkOrder } from '@/features/work-orders/api'
import { useCanManage } from '@/stores/use-has-role'
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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">{equipment?.name ?? 'Equipment'}</h1>
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
    </div>
  )
}
