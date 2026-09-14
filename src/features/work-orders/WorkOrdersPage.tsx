import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarCog } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { fetchWorkOrdersForBranch, generateTaskFromWorkOrder } from '@/features/work-orders/api'
import { useBranchStore } from '@/stores/branch-store'
import { useCanManage } from '@/stores/use-has-role'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['work-orders', 'branch', activeBranchId],
    queryFn: () => fetchWorkOrdersForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const generateMutation = useMutation({
    mutationFn: generateTaskFromWorkOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Tugas berhasil dibuat dari work order.')
    },
  })

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih cabang terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Work Order"
        description="Jadwal perawatan berulang (kalender/jam operasi) untuk equipment di cabang ini. Kelola per equipment lewat halaman detailnya."
      />

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
          description="Tambahkan lewat halaman detail equipment (bagian Work Order)."
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
    </div>
  )
}
