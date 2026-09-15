import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarCog } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { fetchEquipmentList } from '@/features/equipment/api'
import { fetchLines } from '@/features/lines/api'
import { fetchMachines } from '@/features/machines/api'
import { TaskFormDialog } from '@/features/tasks/TaskFormDialog'
import { TaskRow } from '@/features/tasks/TaskRow'
import { fetchTasksForEquipment } from '@/features/tasks/api'
import { fetchWorkOrdersForBranch, generateTaskFromWorkOrder } from '@/features/work-orders/api'
import { WorkOrderFormDialog } from '@/features/work-orders/WorkOrderFormDialog'
import { useBranchStore } from '@/stores/branch-store'
import { useCanManage } from '@/stores/use-has-role'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const scheduleLabels: Record<string, string> = {
  calendar: 'Kalender',
  runtime: 'Jam Operasi',
  unscheduled: 'Tidak Terjadwal',
}

export function WorkOrdersPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canManage = useCanManage()
  const queryClient = useQueryClient()

  const [selectedLineId, setSelectedLineId] = useState<number | null>(null)
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null)
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null)

  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['work-orders', 'branch', activeBranchId],
    queryFn: () => fetchWorkOrdersForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const { data: lines } = useQuery({
    queryKey: ['lines', activeBranchId],
    queryFn: () => fetchLines(activeBranchId!),
    enabled: !!activeBranchId && canManage,
  })

  const { data: machines } = useQuery({
    queryKey: ['machines', selectedLineId],
    queryFn: () => fetchMachines(selectedLineId!),
    enabled: !!selectedLineId,
  })

  const { data: equipmentList } = useQuery({
    queryKey: ['equipment', selectedMachineId],
    queryFn: () => fetchEquipmentList(selectedMachineId!),
    enabled: !!selectedMachineId,
  })

  const selectedEquipment = equipmentList?.find((equipment) => equipment.id === selectedEquipmentId)

  const { data: equipmentTasks, isLoading: equipmentTasksLoading } = useQuery({
    queryKey: ['tasks', selectedEquipmentId],
    queryFn: () => fetchTasksForEquipment(selectedEquipmentId!),
    enabled: !!selectedEquipmentId,
  })

  const generateMutation = useMutation({
    mutationFn: generateTaskFromWorkOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Tugas berhasil dibuat dari work order.')
    },
  })

  function selectLine(lineId: number) {
    setSelectedLineId(lineId)
    setSelectedMachineId(null)
    setSelectedEquipmentId(null)
  }

  function selectMachine(machineId: number) {
    setSelectedMachineId(machineId)
    setSelectedEquipmentId(null)
  }

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih cabang terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Work Order"
        description="Jadwal perawatan berulang (kalender/jam operasi) dan tugas untuk equipment di cabang ini."
      />

      {canManage && (
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <p className="text-sm font-medium">Pilih equipment untuk menambahkan Work Order atau Tugas</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Line</Label>
              <Select value={selectedLineId ? String(selectedLineId) : ''} onValueChange={(v) => selectLine(Number(v))}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Pilih line" />
                </SelectTrigger>
                <SelectContent>
                  {lines?.map((line) => (
                    <SelectItem key={line.id} value={String(line.id)}>
                      {line.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Mesin</Label>
              <Select
                value={selectedMachineId ? String(selectedMachineId) : ''}
                onValueChange={(v) => selectMachine(Number(v))}
                disabled={!selectedLineId}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Pilih mesin" />
                </SelectTrigger>
                <SelectContent>
                  {machines?.map((machine) => (
                    <SelectItem key={machine.id} value={String(machine.id)}>
                      {machine.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Equipment</Label>
              <Select
                value={selectedEquipmentId ? String(selectedEquipmentId) : ''}
                onValueChange={(v) => setSelectedEquipmentId(Number(v))}
                disabled={!selectedMachineId}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Pilih equipment" />
                </SelectTrigger>
                <SelectContent>
                  {equipmentList?.map((equipment) => (
                    <SelectItem key={equipment.id} value={String(equipment.id)}>
                      {equipment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedEquipmentId && (
              <div className="flex gap-2">
                <WorkOrderFormDialog
                  equipmentId={selectedEquipmentId}
                  trigger={<Button size="sm">Tambah Work Order</Button>}
                />
                <TaskFormDialog
                  equipmentId={selectedEquipmentId}
                  trigger={
                    <Button size="sm" variant="outline">
                      Tambah Tugas
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : workOrders?.length === 0 ? (
        <EmptyState
          icon={CalendarCog}
          title="Belum ada Work Order di cabang ini"
          description="Pilih equipment di atas untuk mulai menambahkan."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Judul</TableHead>
              <TableHead>Equipment / Line</TableHead>
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
                <TableCell className="text-muted-foreground">
                  <Link to={`/equipment/${wo.equipment_id}`} className="hover:underline">
                    {wo.equipment_name}
                  </Link>
                  <div className="text-xs">
                    {wo.machine_name} · {wo.line_name}
                  </div>
                </TableCell>
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

      {selectedEquipmentId && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Tugas — {selectedEquipment?.name}</h2>
          {equipmentTasksLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : equipmentTasks?.length === 0 ? (
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
                {equipmentTasks?.map((task) => (
                  <TaskRow key={task.id} task={task} invalidateKey={['tasks', selectedEquipmentId]} />
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  )
}
