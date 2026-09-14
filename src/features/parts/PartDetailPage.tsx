import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/Breadcrumb'
import { fetchEquipmentForPart } from '@/features/equipment-parts/api'
import { fetchInstallationsForPart } from '@/features/part-installations/api'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

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

  const { data: installations, isLoading: installationsLoading } = useQuery({
    queryKey: ['installations-for-part', partId],
    queryFn: () => fetchInstallationsForPart(partId),
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
    <div className="flex flex-col gap-6">
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{part.name}</h1>
            {!part.is_active && <Badge variant="secondary">Nonaktif</Badge>}
          </div>
          <p className="font-mono text-sm text-muted-foreground">{part.item_master_no}</p>
          <p className="mt-1 font-medium">{currencyFormatter.format(Number(part.price))}</p>
          {part.description && <p className="mt-2 text-muted-foreground">{part.description}</p>}
        </div>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stok &amp; Lokasi</TabsTrigger>
          <TabsTrigger value="suppliers">Supplier</TabsTrigger>
          <TabsTrigger value="usage">Digunakan di Equipment</TabsTrigger>
          <TabsTrigger value="lifetime">Riwayat Pemasangan</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cabang</TableHead>
                <TableHead>Lokasi</TableHead>
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
                  <TableCell className="text-muted-foreground">
                    {stock.location_id ? (
                      <Link to={`/locations/${stock.location_id}`} className="font-mono hover:underline">
                        {stock.location_code}
                      </Link>
                    ) : (
                      'Belum ditempatkan'
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">{stock.quantity_on_hand}</TableCell>
                  <TableCell>
                    {stock.is_critical ? (
                      <Badge variant="destructive">Kritis</Badge>
                    ) : stock.is_below_reorder_point ? (
                      <Badge variant="warning">Rendah</Badge>
                    ) : (
                      <Badge variant="outline">Normal</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="suppliers" className="pt-4">
          <div className="mb-3 flex justify-end">
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
                    <TableCell className="font-medium">
                      <Link to={`/suppliers/${ps.supplier_id}`} className="hover:underline">
                        {ps.supplier_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{ps.branch_name}</TableCell>
                    <TableCell className="text-right">
                      {ps.price ? currencyFormatter.format(Number(ps.price)) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {ps.lead_time_days != null ? `${ps.lead_time_days} hari` : '-'}
                    </TableCell>
                    <TableCell>
                      {ps.is_preferred ? <Badge>Utama</Badge> : <Badge variant="outline">Alternatif</Badge>}
                    </TableCell>
                    {canManage && (
                      <TableCell className="flex justify-end gap-1">
                        {activeBranchId && (
                          <PartSupplierFormDialog
                            partId={partId}
                            branchId={activeBranchId}
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
                        )}
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
                              <AlertDialogTitle>Hapus supplier ini dari part?</AlertDialogTitle>
                              <AlertDialogDescription>
                                "{ps.supplier_name}" tidak akan lagi terdaftar sebagai supplier untuk part
                                ini.
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
        </TabsContent>

        <TabsContent value="usage" className="pt-4">
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
                  <TableHead>Line &rarr; Machine &rarr; Equipment</TableHead>
                  <TableHead className="text-right">Jumlah Dibutuhkan</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipmentUsage?.map((ep) => (
                  <TableRow key={ep.id}>
                    <TableCell>
                      <Breadcrumb
                        segments={[
                          {
                            label: ep.line_name ?? 'Line',
                            to: ep.line_id ? `/lines?line=${ep.line_id}` : undefined,
                          },
                          {
                            label: ep.machine_name ?? 'Mesin',
                            to: ep.machine_id ? `/lines?line=${ep.line_id}&machine=${ep.machine_id}` : undefined,
                          },
                          {
                            label: ep.equipment_name ?? `Equipment #${ep.equipment_id}`,
                            to: `/equipment/${ep.equipment_id}`,
                          },
                        ]}
                      />
                    </TableCell>
                    <TableCell className="text-right">{ep.quantity_required ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{ep.notes ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="lifetime" className="pt-4">
          {installationsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : installations?.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Part ini belum pernah tercatat terpasang di equipment manapun.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Line &rarr; Machine &rarr; Equipment</TableHead>
                  <TableHead>Tanggal Pasang</TableHead>
                  <TableHead className="text-right">Usia</TableHead>
                  <TableHead className="text-right">Pemakaian</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installations?.map((installation) => (
                  <TableRow key={installation.id}>
                    <TableCell>
                      <Breadcrumb
                        segments={[
                          {
                            label: installation.line_name ?? 'Line',
                            to: installation.line_id ? `/lines?line=${installation.line_id}` : undefined,
                          },
                          {
                            label: installation.machine_name ?? 'Mesin',
                            to: installation.machine_id
                              ? `/lines?line=${installation.line_id}&machine=${installation.machine_id}`
                              : undefined,
                          },
                          {
                            label: installation.equipment_name ?? `Equipment #${installation.equipment_id}`,
                            to: `/equipment/${installation.equipment_id}`,
                          },
                        ]}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(installation.installed_at).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {installation.age_in_days} hari
                    </TableCell>
                    <TableCell className="text-right">
                      {installation.percent_used != null ? (
                        <Badge
                          variant={
                            installation.percent_used >= 100
                              ? 'destructive'
                              : installation.percent_used >= 80
                                ? 'warning'
                                : 'outline'
                          }
                        >
                          {Math.round(installation.percent_used)}%
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {installation.is_active ? (
                        <Badge variant="outline">Terpasang</Badge>
                      ) : (
                        <Badge variant="secondary">Dilepas</Badge>
                      )}
                    </TableCell>
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
