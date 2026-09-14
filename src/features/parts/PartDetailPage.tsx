import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { fetchEquipmentForPart } from '@/features/equipment-parts/api'
import { fetchPart } from '@/features/parts/api'
import { PartSupplierFormDialog } from '@/features/part-suppliers/PartSupplierFormDialog'
import { fetchPartSuppliers, removePartSupplier } from '@/features/part-suppliers/api'
import { useBranchStore } from '@/stores/branch-store'
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

export function PartDetailPage() {
  const { id } = useParams<{ id: string }>()
  const partId = Number(id)
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canManage = useCanManage()
  const queryClient = useQueryClient()

  const { data: part, isLoading } = useQuery({
    queryKey: ['part', partId],
    queryFn: () => fetchPart(partId),
  })

  const { data: partSuppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ['part-suppliers', partId],
    queryFn: () => fetchPartSuppliers(partId),
  })

  const { data: equipmentUsage, isLoading: equipmentUsageLoading } = useQuery({
    queryKey: ['equipment-for-part', partId],
    queryFn: () => fetchEquipmentForPart(partId),
  })

  const removeSupplierMutation = useMutation({
    mutationFn: removePartSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-suppliers', partId] })
      toast.success('Supplier berhasil dihapus dari part ini.')
    },
  })

  if (isLoading || !part) {
    return <Skeleton className="h-64 w-full" />
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex gap-4">
        {part.image_url ? (
          <img
            src={part.image_url}
            alt={part.name}
            className="h-24 w-24 rounded-md border object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            Tanpa foto
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold">{part.name}</h1>
          <p className="font-mono text-sm text-muted-foreground">{part.item_master_no}</p>
          <p className="mt-1 font-medium">
            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
              Number(part.price),
            )}
          </p>
          {part.description && <p className="mt-2 text-muted-foreground">{part.description}</p>}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Stok per Cabang</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cabang</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {part.stocks?.map((stock) => (
              <TableRow key={stock.id}>
                <TableCell>
                  <Link to={`/stock/${stock.id}`} className="font-medium hover:underline">
                    {stock.branch_name ?? `Cabang #${stock.branch_id}`}
                  </Link>
                </TableCell>
                <TableCell className="text-right font-medium">{stock.quantity_on_hand}</TableCell>
                <TableCell>
                  {stock.is_critical ? (
                    <Badge variant="destructive">Kritis</Badge>
                  ) : stock.is_below_reorder_point ? (
                    <Badge variant="secondary">Rendah</Badge>
                  ) : (
                    <Badge variant="outline">Normal</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Supplier yang Disetujui</h2>
          {canManage && activeBranchId && (
            <PartSupplierFormDialog
              partId={partId}
              branchId={activeBranchId}
              trigger={<Button size="sm">Tambah Supplier</Button>}
            />
          )}
        </div>
        {suppliersLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : partSuppliers?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada supplier yang disetujui untuk part ini.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="text-right">Lead Time</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {partSuppliers?.map((ps) => (
                <TableRow key={ps.id}>
                  <TableCell className="font-medium">{ps.supplier_name}</TableCell>
                  <TableCell className="text-muted-foreground">{ps.branch_name}</TableCell>
                  <TableCell className="text-right">
                    {ps.price
                      ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                          Number(ps.price),
                        )
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {ps.lead_time_days != null ? `${ps.lead_time_days} hari` : '-'}
                  </TableCell>
                  <TableCell>
                    {ps.is_preferred ? <Badge>Utama</Badge> : <Badge variant="outline">Alternatif</Badge>}
                  </TableCell>
                  {canManage && (
                    <TableCell className="flex justify-end gap-2">
                      {activeBranchId && (
                        <PartSupplierFormDialog
                          partId={partId}
                          branchId={activeBranchId}
                          partSupplier={ps}
                          trigger={
                            <Button variant="outline" size="sm">
                              Ubah
                            </Button>
                          }
                        />
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
                          Hapus
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus supplier ini dari part?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{ps.supplier_name}" tidak akan lagi terdaftar sebagai supplier untuk part ini.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeSupplierMutation.mutate(ps.id)}>
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
        <h2 className="text-lg font-medium">Digunakan di Equipment (BOM)</h2>
        {equipmentUsageLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : equipmentUsage?.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Part ini belum terdaftar sebagai komponen di equipment manapun.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead className="text-right">Jumlah Dibutuhkan</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipmentUsage?.map((ep) => (
                <TableRow key={ep.id}>
                  <TableCell>
                    <Link to={`/equipment/${ep.equipment_id}`} className="font-medium hover:underline">
                      {ep.equipment_name ?? `Equipment #${ep.equipment_id}`}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">{ep.quantity_required ?? '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{ep.notes ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
