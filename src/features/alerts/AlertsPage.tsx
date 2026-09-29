import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PackageSearch } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { approveReorderRequest, cancelReorderRequest, fetchReorderRequests, markReorderOrdered } from '@/features/alerts/api'
import { useBranchStore } from '@/stores/branch-store'
import { useCanManage } from '@/stores/use-has-role'
import type { ReorderStatus } from '@/types/inventory'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
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

/**
 * Pure Reorder Request board now — the old "Peringatan Stok" tab (driven by
 * StockAlert / minimum_stock+reorder_point) was dropped: Kelola Stok's own
 * Kritis/Peringatan badges (available vs reserved/installed) already cover
 * that, and having both meant two numbers that could disagree. StockAlert
 * itself is untouched server-side — it's still what triggers a
 * ReorderRequest in the first place (see StockAlertService) — it just isn't
 * shown as its own list here anymore.
 */
export function AlertsPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canManage = useCanManage()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<ReorderStatus | 'all'>('pending')

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
    return <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Pemesanan Ulang"
        description="Permintaan pemesanan ulang part yang otomatis dibuat saat stok menyentuh titik reorder-nya."
      />

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
                  <div className="font-mono text-xs text-muted-foreground">{req.item_master_no}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">{req.supplier_name ?? '-'}</TableCell>
                <TableCell className="text-right">{req.quantity_requested}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariants[req.status]}>{statusLabels[req.status]}</Badge>
                </TableCell>
                {canManage && (
                  <TableCell className="flex justify-end gap-2">
                    {req.status === 'pending' && (
                      <AlertDialog>
                        <AlertDialogTrigger render={<Button size="sm" />}>Setujui</AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Setujui pemesanan ulang ini?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Permintaan {req.quantity_requested} unit <strong>{req.part_name}</strong> akan
                              disetujui untuk dipesan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => approveMutation.mutate(req.id)}>
                              Setujui
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
    </div>
  )
}
