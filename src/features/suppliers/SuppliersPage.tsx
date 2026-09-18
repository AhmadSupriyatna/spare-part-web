import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Eye, Pencil, Trash2, Truck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { addPartSupplier } from '@/features/part-suppliers/api'
import { deleteSupplier, fetchSuppliers } from '@/features/suppliers/api'
import { SupplierFormDialog } from '@/features/suppliers/SupplierFormDialog'
import { SupplierPartDrawer } from '@/features/suppliers/SupplierPartDrawer'
import { useBranchStore } from '@/stores/branch-store'
import { useCanManage } from '@/stores/use-has-role'
import type { PartStock } from '@/types/inventory'
import { cn } from '@/lib/utils'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function SupplierDropRow({
  isDragging,
  isArmed,
  onDrop,
  onClick,
  children,
}: {
  isDragging: boolean
  isArmed: boolean
  onDrop: () => void
  onClick: () => void
  children: React.ReactNode
}) {
  const [dropActive, setDropActive] = useState(false)
  const canTarget = isDragging || isArmed

  return (
    <TableRow
      className={cn(
        canTarget && 'cursor-pointer',
        dropActive && 'bg-primary/10 outline-2 -outline-offset-2 outline-primary/50 outline-dashed',
        isArmed && !dropActive && 'bg-primary/5',
      )}
      onDragOver={(e) => {
        if (!isDragging) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
        setDropActive(true)
      }}
      onDragLeave={() => setDropActive(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDropActive(false)
        onDrop()
      }}
      onClick={() => {
        if (isArmed) onClick()
      }}
    >
      {children}
    </TableRow>
  )
}

export function SuppliersPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canManage = useCanManage()
  const queryClient = useQueryClient()

  const [drawerCollapsed, setDrawerCollapsed] = useState(false)
  const [draggingStock, setDraggingStock] = useState<PartStock | null>(null)
  const [armedStock, setArmedStock] = useState<PartStock | null>(null)

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

  const linkMutation = useMutation({
    mutationFn: ({ partId, supplierId }: { partId: number; supplierId: number }) =>
      addPartSupplier(partId, { supplier_id: supplierId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['part-suppliers', variables.partId] })
      toast.success('Part berhasil ditautkan ke supplier.')
      if (armedStock?.id === variables.partId) setArmedStock(null)
      setDraggingStock(null)
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status
      toast.error(status === 422 ? 'Part ini sudah terdaftar untuk supplier tersebut.' : 'Gagal menautkan part.')
    },
  })

  function handleDropOnSupplier(supplierId: number) {
    if (!draggingStock) return
    linkMutation.mutate({ partId: draggingStock.id, supplierId })
  }

  function handleClickSupplier(supplierId: number) {
    if (!armedStock) return
    linkMutation.mutate({ partId: armedStock.id, supplierId })
  }

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Supplier"
        description="Daftar pemasok yang terdaftar untuk plant ini."
        action={canManage && <SupplierFormDialog branchId={activeBranchId} trigger={<Button>Tambah Supplier</Button>} />}
      />

      {armedStock && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          <span>
            Menautkan <strong>{armedStock.part_name}</strong> — tap salah satu supplier di bawah untuk memilih
            tujuan.
          </span>
          <Button variant="ghost" size="sm" onClick={() => setArmedStock(null)}>
            Batal
          </Button>
        </div>
      )}

      <div className="flex flex-col items-start gap-0 lg:flex-row">
        <div className={cn('min-w-0 flex-1', !drawerCollapsed && 'lg:flex-[7] lg:pr-3')}>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : suppliers?.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="Belum ada supplier di plant ini"
              description="Tambahkan supplier supaya bisa dipilih saat menerima stok atau mengelola part."
              action={
                canManage && (
                  <SupplierFormDialog
                    branchId={activeBranchId}
                    trigger={<Button size="sm">Tambah Supplier</Button>}
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
                {suppliers?.map((supplier) => (
                  <SupplierDropRow
                    key={supplier.id}
                    isDragging={!!draggingStock}
                    isArmed={!!armedStock}
                    onDrop={() => handleDropOnSupplier(supplier.id)}
                    onClick={() => handleClickSupplier(supplier.id)}
                  >
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
                                  aria-label="Hapus supplier"
                                  title="Hapus supplier"
                                />
                              }
                            >
                              <Trash2 />
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
                        </>
                      )}
                    </TableCell>
                  </SupplierDropRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div
          className={cn(
            'relative flex w-full shrink-0 lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)]',
            drawerCollapsed ? 'lg:w-6' : 'lg:flex-[3]',
          )}
        >
          <button
            type="button"
            onClick={() => setDrawerCollapsed((prev) => !prev)}
            aria-label={drawerCollapsed ? 'Buka panel part' : 'Tutup panel part'}
            title={drawerCollapsed ? 'Buka panel part' : 'Tutup panel part'}
            className="absolute top-1/2 left-0 z-10 hidden size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm hover:bg-muted lg:flex"
          >
            {drawerCollapsed ? <ChevronLeft className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
          <div className={cn('w-full lg:h-full', drawerCollapsed && 'lg:hidden')}>
            <SupplierPartDrawer
              hidden={false}
              branchId={activeBranchId}
              armedStockId={armedStock?.id ?? null}
              onArmPart={setArmedStock}
              onDragStartPart={setDraggingStock}
              onDragEndPart={() => setDraggingStock(null)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
