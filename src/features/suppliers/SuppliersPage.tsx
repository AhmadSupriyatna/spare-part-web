import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Pencil, Plus, Search, Trash2, Truck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { InventoryAssetsNavigation } from '@/components/InventoryAssetsNavigation'
import { deleteSupplier, fetchSuppliers } from '@/features/suppliers/api'
import { SupplierFormDialog } from '@/features/suppliers/SupplierFormDialog'
import { useBranchStore } from '@/stores/branch-store'
import { useCanManage } from '@/stores/use-has-role'
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
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

/**
 * Plain registration list (add/edit/delete/aktif-nonaktif) — the drag-and-drop
 * "link a part to a supplier" panel this page used to carry alongside the
 * table was removed: that job is now done from Kelola Stok's "Pilih
 * Supplier" action, so keeping a second entry point here was pure
 * redundancy.
 */
export function SuppliersPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canManage = useCanManage()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

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
  const filteredSuppliers = suppliers?.filter((supplier) =>
    [supplier.name, supplier.contact_person, supplier.phone, supplier.email]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(search.trim().toLowerCase()) ?? false),
  )

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Suppliers"
        description="Daftar pemasok yang terdaftar untuk plant ini."
        action={<InventoryAssetsNavigation />}
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama, kontak, telepon, atau email supplier"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        {canManage && (
          <SupplierFormDialog
            branchId={activeBranchId}
            trigger={
              <Button>
                <Plus />
                Supplier
              </Button>
            }
          />
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : filteredSuppliers?.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={search ? 'Supplier tidak ditemukan' : 'Belum ada supplier di plant ini'}
          description={
            search
              ? 'Coba kata kunci lain.'
              : 'Tambahkan supplier supaya bisa dipilih saat menerima stok atau mengelola part.'
          }
          action={
            !search &&
            canManage && (
              <SupplierFormDialog
                branchId={activeBranchId}
                trigger={
                  <Button size="sm">
                    <Plus />
                    Supplier
                  </Button>
                }
              />
            )
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers?.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell className="text-muted-foreground">{supplier.contact_person ?? '-'}</TableCell>
                <TableCell className="text-muted-foreground">{supplier.phone ?? '-'}</TableCell>
                <TableCell className="text-muted-foreground">{supplier.email ?? '-'}</TableCell>
                <TableCell>
                  {supplier.is_active ? (
                    <Badge variant="success">Aktif</Badge>
                  ) : (
                    <Badge variant="secondary">Nonaktif</Badge>
                  )}
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    nativeButton={false}
                    aria-label="Lihat detail"
                    title="Lihat detail"
                    render={<Link to={`/suppliers/${supplier.id}`} />}
                  >
                    <Eye />
                  </Button>
                  {canManage && (
                    <>
                      <SupplierFormDialog
                        branchId={activeBranchId}
                        supplier={supplier}
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label="Ubah supplier" title="Ubah supplier">
                            <Pencil />
                          </Button>
                        }
                      />
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" aria-label="Hapus supplier" title="Hapus supplier" />
                          }
                        >
                          <Trash2 />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus supplier ini?</AlertDialogTitle>
                            <AlertDialogDescription>"{supplier.name}" akan dihapus permanen.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(supplier.id)}>
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
