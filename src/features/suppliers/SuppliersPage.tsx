import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { deleteSupplier, fetchSuppliers } from '@/features/suppliers/api'
import { SupplierFormDialog } from '@/features/suppliers/SupplierFormDialog'
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

export function SuppliersPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canManage = useCanManage()
  const queryClient = useQueryClient()

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers', activeBranchId],
    queryFn: () => fetchSuppliers(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', activeBranchId] })
      toast.success('Supplier berhasil dihapus.')
    },
  })

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih cabang terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Supplier</h1>
        {canManage && (
          <SupplierFormDialog branchId={activeBranchId} trigger={<Button>Tambah Supplier</Button>} />
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : suppliers?.length === 0 ? (
        <p className="text-muted-foreground">Belum ada supplier di cabang ini.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers?.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">
                  <Link to={`/suppliers/${supplier.id}`} className="hover:underline">
                    {supplier.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{supplier.contact_person ?? '-'}</TableCell>
                <TableCell className="text-muted-foreground">{supplier.phone ?? '-'}</TableCell>
                <TableCell className="text-muted-foreground">{supplier.email ?? '-'}</TableCell>
                <TableCell>
                  {supplier.is_active ? (
                    <Badge variant="outline">Aktif</Badge>
                  ) : (
                    <Badge variant="secondary">Nonaktif</Badge>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell className="flex justify-end gap-2">
                    <SupplierFormDialog
                      branchId={activeBranchId}
                      supplier={supplier}
                      trigger={
                        <Button variant="outline" size="sm">
                          Ubah
                        </Button>
                      }
                    />
                    <AlertDialog>
                      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
                        Hapus
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus supplier ini?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{supplier.name}" akan dihapus permanen.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(supplier.id)}>
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
  )
}
