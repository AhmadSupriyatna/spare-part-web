import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, PackageSearch } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  approveReorderRequest,
  cancelReorderRequest,
  fetchReorderRequests,
  fetchStockAlerts,
  markReorderOrdered,
} from '@/features/alerts/api'
import { useBranchStore } from '@/stores/branch-store'
import { useCanManage } from '@/stores/use-has-role'
import type { ReorderStatus } from '@/types/inventory'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const statusLabels: Record<ReorderStatus, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  ordered: 'Sudah Dipesan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

const statusBadgeVariants: Record<ReorderStatus, 'warning' | 'outline' | 'success' | 'secondary'> = {
  pending: 'warning',
  approved: 'outline',
  ordered: 'outline',
  completed: 'success',
  cancelled: 'secondary',
}

export function AlertsPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canManage = useCanManage()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<ReorderStatus | 'all'>('pending')

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['stock-alerts', activeBranchId],
    queryFn: () => fetchStockAlerts(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const { data: reorderRequests, isLoading: reorderLoading } = useQuery({
    queryKey: ['reorder-requests', activeBranchId, statusFilter],
    queryFn: () =>
      fetchReorderRequests(activeBranchId!, statusFilter === 'all' ? undefined : statusFilter),
    enabled: !!activeBranchId,
  })

  function invalidateReorder() {
    queryClient.invalidateQueries({ queryKey: ['reorder-requests', activeBranchId] })
  }

  const approveMutation = useMutation({
    mutationFn: approveReorderRequest,
    onSuccess: () => {
      invalidateReorder()
      toast.success('Permintaan disetujui.')
    },
  })

  const orderedMutation = useMutation({
    mutationFn: (id: number) => markReorderOrdered(id),
    onSuccess: () => {
      invalidateReorder()
      toast.success('Ditandai sudah dipesan.')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelReorderRequest(id),
    onSuccess: () => {
      invalidateReorder()
      toast.success('Permintaan dibatalkan.')
    },
  })

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih cabang terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Peringatan & Pemesanan Ulang"
        description="Part yang stoknya menipis di cabang ini, dan status pemesanan ulangnya."
      />

      <Tabs defaultValue="alerts">
        <TabsList>
          <TabsTrigger value="alerts">Peringatan Stok</TabsTrigger>
          <TabsTrigger value="reorder">Permintaan Pemesanan Ulang</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="mt-4">
          {alertsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : alerts?.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="Tidak ada peringatan stok aktif"
              description="Semua part di cabang ini masih di atas titik reorder-nya."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Stok Saat Trigger</TableHead>
                  <TableHead>Waktu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts?.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <div className="font-medium">{alert.part_name}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {alert.item_master_no}
                      </div>
                    </TableCell>
                    <TableCell>
                      {alert.level === 'critical' ? (
                        <Badge variant="destructive">Kritis</Badge>
                      ) : (
                        <Badge variant="warning">Rendah</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{alert.quantity_on_hand_at_trigger}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(alert.created_at).toLocaleString('id-ID')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="reorder" className="mt-4 flex flex-col gap-4">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ReorderStatus | 'all')}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {reorderLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : reorderRequests?.length === 0 ? (
            <EmptyState icon={PackageSearch} title="Tidak ada permintaan pemesanan ulang" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reorderRequests?.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="font-medium">{req.part_name}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {req.item_master_no}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {req.supplier_name ?? '-'}
                    </TableCell>
                    <TableCell className="text-right">{req.quantity_requested}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariants[req.status]}>{statusLabels[req.status]}</Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="flex justify-end gap-2">
                        {req.status === 'pending' && (
                          <Button size="sm" onClick={() => approveMutation.mutate(req.id)}>
                            Setujui
                          </Button>
                        )}
                        {req.status === 'approved' && (
                          <Button size="sm" onClick={() => orderedMutation.mutate(req.id)}>
                            Tandai Dipesan
                          </Button>
                        )}
                        {(req.status === 'pending' || req.status === 'approved') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelMutation.mutate(req.id)}
                          >
                            Batalkan
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
