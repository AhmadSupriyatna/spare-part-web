import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MapPin, PackagePlus, Pencil, SlidersHorizontal, Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/Breadcrumb'
import { fetchInstallationsForPart } from '@/features/part-installations/api'
import { fetchUnitsForPart } from '@/features/part-units/api'
import { fetchPart } from '@/features/parts/api'
import { partReplacementStrategyOptions } from '@/features/parts/schema'
import { AdjustStockDialog } from '@/features/part-stocks/AdjustStockDialog'
import { fetchPartStockLedger, fetchPartStockReservations } from '@/features/part-stocks/api'
import { ReceiveStockDialog } from '@/features/part-stocks/ReceiveStockDialog'
import { SetPartLocationDialog } from '@/features/part-stocks/SetPartLocationDialog'
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

const strategyMeta = Object.fromEntries(partReplacementStrategyOptions.map((o) => [o.value, o]))

const ledgerTypeLabels: Record<string, string> = {
  receiving: 'Penerimaan',
  issue: 'Pemakaian',
  adjustment: 'Penyesuaian',
  return: 'Retur',
  transfer_in: 'Transfer Masuk',
  transfer_out: 'Transfer Keluar',
  correction: 'Koreksi',
}

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

  const { data: installations, isLoading: installationsLoading } = useQuery({
    queryKey: ['installations-for-part', partId],
    queryFn: () => fetchInstallationsForPart(partId),
  })

  const { data: units, isLoading: unitsLoading } = useQuery({
    queryKey: ['part-units', partId],
    queryFn: () => fetchUnitsForPart(partId),
  })

  const activeStock = part?.stocks?.find((stock) => stock.branch_id === activeBranchId)

  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ['part-stock-ledger', activeStock?.id],
    queryFn: () => fetchPartStockLedger(activeStock!.id),
    enabled: !!activeStock,
  })

  const { data: reservations, isLoading: reservationsLoading } = useQuery({
    queryKey: ['part-stock-reservations', activeStock?.id],
    queryFn: () => fetchPartStockReservations(activeStock!.id),
    enabled: !!activeStock,
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
      <Link to="/stock" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Kembali ke Workspace
      </Link>

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
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              {(() => {
                const Icon = strategyMeta[part.replacement_strategy].icon
                return <Icon className="size-3" />
              })()}
              {strategyMeta[part.replacement_strategy].label}
            </Badge>
          </div>
          {part.replacement_strategy === 'life_based' && part.estimated_lifetime_hours && (
            <p className="mt-1 text-sm text-muted-foreground">
              Perkiraan umur pakai:{' '}
              <span className="font-medium text-foreground">{part.estimated_lifetime_hours} jam</span>{' '}
              operasional
            </p>
          )}
          {part.description && <p className="mt-2 text-muted-foreground">{part.description}</p>}
        </div>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stok &amp; Lokasi</TabsTrigger>
          <TabsTrigger value="suppliers">Supplier</TabsTrigger>
          <TabsTrigger value="lifetime">Riwayat Pemasangan</TabsTrigger>
          <TabsTrigger value="units">Unit Part</TabsTrigger>
          <TabsTrigger value="stock-ledger">Riwayat Stok</TabsTrigger>
          <TabsTrigger value="reservations">Reservasi PM</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plant</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-right">Harga Modal</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {part.stocks?.map((stock) => (
                <TableRow key={stock.id}>
                  <TableCell>
                    <Link to={`/stock/${stock.id}`} className="font-medium hover:underline">
                      {stock.branch_name ?? `Plant #${stock.branch_id}`}
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
                  <TableCell className="text-right text-muted-foreground">
                    {currencyFormatter.format(Number(stock.unit_cost))}
                  </TableCell>
                  <TableCell>
                    {stock.is_critical ? (
                      <Badge variant="destructive">Kritis</Badge>
                    ) : stock.is_warning ? (
                      <Badge variant="warning">Peringatan</Badge>
                    ) : (
                      <Badge variant="outline">Normal</Badge>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="flex justify-end gap-1">
                      <ReceiveStockDialog
                        partStockId={stock.id}
                        branchId={stock.branch_id}
                        currentQuantity={stock.quantity_on_hand}
                        currentUnitCost={stock.unit_cost}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Terima barang"
                            title="Terima barang"
                          >
                            <PackagePlus />
                          </Button>
                        }
                      />
                      <AdjustStockDialog
                        partStockId={stock.id}
                        branchId={stock.branch_id}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Sesuaikan stok"
                            title="Sesuaikan stok"
                          >
                            <SlidersHorizontal />
                          </Button>
                        }
                      />
                      <SetPartLocationDialog
                        partId={partId}
                        partStockId={stock.id}
                        branchId={stock.branch_id}
                        branchName={stock.branch_name}
                        currentLocationId={stock.location_id}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Atur lokasi"
                            title="Atur lokasi"
                          >
                            <MapPin />
                          </Button>
                        }
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="suppliers" className="pt-4">
          <div className="mb-3 flex justify-end">
            {canManage && (
              <PartSupplierFormDialog
                partId={partId}
                defaultBranchId={activeBranchId ?? undefined}
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
                  <TableHead>Plant</TableHead>
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
                        <PartSupplierFormDialog
                          partId={partId}
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
                                : 'success'
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
                        <Badge variant="success">Terpasang</Badge>
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

        <TabsContent value="units" className="pt-4">
          {unitsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : units?.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada unit fisik part ini yang tercatat (dibuat otomatis saat pertama kali dipasang).
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sisa Umur</TableHead>
                  <TableHead className="text-right">Jumlah Pasang</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units?.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell>
                      <Link to={`/part-units/${unit.id}`} className="font-medium hover:underline">
                        Unit {unit.unit_code}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          unit.status === 'in_service'
                            ? 'success'
                            : unit.status === 'scrapped'
                              ? 'destructive'
                              : unit.status === 'available'
                                ? 'secondary'
                                : 'warning'
                        }
                      >
                        {
                          {
                            in_service: 'Terpasang',
                            pending_repair: 'Menunggu Keputusan',
                            in_repair: 'Sedang Diperbaiki',
                            available: 'Siap Dipasang',
                            scrapped: 'Dibuang',
                          }[unit.status]
                        }
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {unit.percent_used != null ? `${100 - unit.percent_used}%` : '-'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{unit.install_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="stock-ledger" className="pt-4">
          {!activeStock ? (
            <p className="text-sm text-muted-foreground">
              Part ini belum punya stok di plant yang sedang aktif — pilih plant lain, atau lihat tab Stok &amp;
              Lokasi.
            </p>
          ) : ledgerLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !ledger || ledger.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada riwayat perubahan stok di plant ini.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead className="text-right">Perubahan</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead>Oleh</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(entry.occurred_at).toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell>{ledgerTypeLabels[entry.type] ?? entry.type}</TableCell>
                    <TableCell
                      className={`text-right font-medium tabular-nums ${entry.quantity_change < 0 ? 'text-destructive' : 'text-success'}`}
                    >
                      {entry.quantity_change > 0 ? '+' : ''}
                      {entry.quantity_change}
                    </TableCell>
                    <TableCell className="text-right">{entry.balance_after}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.notes ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.user?.name ?? 'Sistem'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="reservations" className="pt-4">
          {!activeStock ? (
            <p className="text-sm text-muted-foreground">
              Part ini belum punya stok di plant yang sedang aktif — pilih plant lain, atau lihat tab Stok &amp;
              Lokasi.
            </p>
          ) : reservationsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !reservations || reservations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tidak ada WO yang akan datang yang mereservasi part ini di plant ini.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>WO</TableHead>
                  <TableHead>Equipment / Line</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead className="text-right">Qty Direservasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((reservation) => (
                  <TableRow key={reservation.task_id}>
                    <TableCell className="font-medium">{reservation.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {reservation.equipment_name}
                      <div className="text-xs">
                        {reservation.machine_name} · {reservation.line_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {reservation.due_date ? new Date(reservation.due_date).toLocaleDateString('id-ID') : '-'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{reservation.quantity}</TableCell>
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
