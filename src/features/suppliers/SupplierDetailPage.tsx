import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { AddPartToSupplierDialog } from '@/features/part-suppliers/AddPartToSupplierDialog'
import { PartSupplierFormDialog } from '@/features/part-suppliers/PartSupplierFormDialog'
import { fetchPartsForSupplier, removePartSupplier } from '@/features/part-suppliers/api'
import { fetchSupplier } from '@/features/suppliers/api'
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

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supplierId = Number(id)
  const canManage = useCanManage()
  const queryClient = useQueryClient()

  const { data: supplier, isLoading } = useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: () => fetchSupplier(supplierId),
  })

  const { data: partSuppliers, isLoading: partsLoading } = useQuery({
    queryKey: ['parts-for-supplier', supplierId],
    queryFn: () => fetchPartsForSupplier(supplierId),
  })

  const removeMutation = useMutation({
    mutationFn: removePartSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts-for-supplier', supplierId] })
      toast.success('Part berhasil dihapus dari supplier ini.')
    },
  })

  if (isLoading || !supplier) {
    return <Skeleton className="h-64 w-full" />
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">{supplier.name}</h1>
        <p className="text-sm text-muted-foreground">{supplier.contact_person ?? 'Tanpa kontak person'}</p>
        <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
          {supplier.phone && <p>Telepon: {supplier.phone}</p>}
          {supplier.email && <p>Email: {supplier.email}</p>}
          {supplier.address && <p>Alamat: {supplier.address}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Part yang Disuplai</h2>
          {canManage && (
            <AddPartToSupplierDialog
              supplierId={supplierId}
              trigger={<Button size="sm">Tambah Part</Button>}
            />
          )}
        </div>
        {partsLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : partSuppliers?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada part yang disuplai oleh supplier ini.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="text-right">Lead Time</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {partSuppliers?.map((ps) => (
                <TableRow key={ps.id}>
                  <TableCell>
                    <Link to={`/parts/${ps.part_id}`} className="font-medium hover:underline">
                      {ps.part_name ?? `Part #${ps.part_id}`}
                    </Link>
                    <p className="font-mono text-xs text-muted-foreground">{ps.item_master_no}</p>
                  </TableCell>
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
                    <TableCell className="flex justify-end gap-1">
                      <PartSupplierFormDialog
                        partId={ps.part_id}
                        branchId={supplier.branch_id}
                        partSupplier={ps}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Ubah supplier"
                            title="Ubah supplier"
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
                              aria-label="Hapus part"
                              title="Hapus part"
                            />
                          }
                        >
                          <Trash2 />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus part ini dari supplier?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{ps.part_name ?? `Part #${ps.part_id}`}" tidak akan lagi terdaftar sebagai
                              part yang disuplai supplier ini.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeMutation.mutate(ps.id)}>
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
    </div>
  )
}
