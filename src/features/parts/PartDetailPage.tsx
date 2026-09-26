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
import { fetchPartStockAnalytics, fetchPartStockLedger, fetchPartStockReservations } from '@/features/part-stocks/api'
import { ReceiveStockDialog } from '@/features/part-stocks/ReceiveStockDialog'
import { SetPartLocationDialog } from '@/features/part-stocks/SetPartLocationDialog'
import { PartSupplierFormDialog } from '@/features/part-suppliers/PartSupplierFormDialog'
import { fetchPartSuppliers, removePartSupplier } from '@/features/part-suppliers/api'
import { useBranchStore } from '@/stores/branch-store'
import { useCanManage } from '@/stores/use-has-role'
import { cn } from '@/lib/utils'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function monthLabel(month: string): string {
  const [, m] = month.split('-')
  return MONTH_LABELS[Number(m) - 1] ?? month
}

/** Thin bars, one hue (primary), rounded top, baseline-anchored — qty shown directly above each bar per request, not hover-only. */
function MonthlyUsageChart({ data }: { data: { month: string; quantity: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.quantity))
  const total = data.reduce((sum, d) => sum + d.quantity, 0)

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada pemakaian tercatat dalam 12 bulan terakhir.</p>
  }

  return (
    <div className="flex h-32 items-end gap-1.5">
      {data.map((d) => (
        <div key={d.month} className="flex flex-1 flex-col items-center gap-0.5">
          <span className="text-[10px] font-medium tabular-nums text-foreground">{d.quantity > 0 ? d.quantity : ''}</span>
          <div className="flex h-20 w-full items-end" title={`${monthLabel(d.month)}: ${d.quantity} unit terpakai`}>
            <div
              className={cn('w-full rounded-t', d.quantity > 0 ? 'bg-primary' : 'bg-muted')}
              style={{ height: `${d.quantity > 0 ? Math.max((d.quantity / max) * 100, 6) : 3}%` }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground">{monthLabel(d.month)}</span>
        </div>
      ))}
    </div>
  )
}

/** Sequential single-hue (primary) intensity per (line, machine) cell — discrete steps via bg-primary/N so the count label inside stays fully readable. */
function heatCellClass(count: number, max: number): string {
  if (count === 0) return 'bg-muted/40 text-muted-foreground'
  const ratio = count / max
  if (ratio >= 0.75) return 'bg-primary text-primary-foreground'
  if (ratio >= 0.5) return 'bg-primary/70 text-primary-foreground'
  if (ratio >= 0.25) return 'bg-primary/40 text-foreground'
  return 'bg-primary/20 text-foreground'
}

function LineMachineHeatmap({ data }: { data: { line_name: string; machine_name: string; count: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Tidak ada equipment yang sedang memakai part ini.</p>
  }

  const lines = Array.from(new Set(data.map((d) => d.line_name)))
  const machines = Array.from(new Set(data.map((d) => d.machine_name)))
  const max = Math.max(1, ...data.map((d) => d.count))
  const cellCount = (line: string, machine: string) =>
    data.find((d) => d.line_name === line && d.machine_name === machine)?.count ?? 0

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="p-1" />
            {machines.map((machine) => (
              <th key={machine} className="p-1 text-left font-medium text-muted-foreground">
                {machine}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line}>
              <td className="p-1 pr-2 text-right font-medium text-muted-foreground">{line}</td>
              {machines.map((machine) => {
                const count = cellCount(line, machine)
                return (
                  <td key={machine} className="p-1">
                    <div
                      title={count > 0 ? `${line} · ${machine}: ${count} unit terpasang` : undefined}
                      className={cn(
                        'flex size-9 items-center justify-center rounded text-[11px] font-medium',
                        heatCellClass(count, max),
                      )}
                    >
                      {count > 0 ? count : ''}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
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

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['part-stock-analytics', activeStock?.id],
    queryFn: () => fetchPartStockAnalytics(activeStock!.id),
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

  const activeInstallations = installations?.filter((installation) => installation.is_active) ?? []

  return (
    <div className="flex flex-col gap-6">
      <Link to="/stock" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Kembali ke Workspace
      </Link>

      <div className="flex gap-4">
        {part.image_url ? (
          <img src={part.image_url} alt={part.name} className="h-24 w-24 rounded-md border object-cover" />
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
          {part.description && <p className="mt-2 text-muted-foreground">{part.description}</p>}
        </div>
      </div>

      {!activeStock ? (
        <p className="text-sm text-muted-foreground">
          Part ini belum punya stok di plant yang sedang aktif — pilih plant lain untuk melihat data selengkapnya.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Qty Saat Ini" value={String(activeStock.quantity_on_hand)} sub={`Tersedia: ${activeStock.available_quantity}`} />
          <StatTile label="Harga Modal" value={currencyFormatter.format(Number(activeStock.unit_cost))} />
          <StatTile label="Lokasi" value={activeStock.location_code ?? 'Belum ditempatkan'} />
          <StatTile
            label="Status"
            value={activeStock.is_critical ? 'Kritis' : activeStock.is_warning ? 'Peringatan' : 'Normal'}
          />
        </div>
      )}

      {canManage && activeStock && (
        <div className="flex flex-wrap gap-2">
          <ReceiveStockDialog
            branchId={activeStock.branch_id}
            partStockId={activeStock.id}
            currentQuantity={activeStock.quantity_on_hand}
            currentUnitCost={activeStock.unit_cost}
            trigger={
              <Button size="sm">
                <PackagePlus />
                Stock In
              </Button>
            }
          />
          <AdjustStockDialog
            partStockId={activeStock.id}
            branchId={activeStock.branch_id}
            trigger={
              <Button size="sm" variant="outline">
                <SlidersHorizontal />
                Stock Opname
              </Button>
            }
          />
          <SetPartLocationDialog
            partId={partId}
            partStockId={activeStock.id}
            branchId={activeStock.branch_id}
            currentLocationId={activeStock.location_id}
            trigger={
              <Button size="sm" variant="outline">
                <MapPin />
                Edit Lokasi
              </Button>
            }
          />
        </div>
      )}

      {activeStock && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Pemakaian per Bulan (12 Bulan Terakhir)</CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? <Skeleton className="h-28 w-full" /> : <MonthlyUsageChart data={analytics?.monthly_usage ?? []} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Sebaran Pemakaian — Line &times; Mesin</CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? <Skeleton className="h-28 w-full" /> : <LineMachineHeatmap data={analytics?.line_machine_heatmap ?? []} />}
            </CardContent>
          </Card>
        </div>
      )}

      {activeStock && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatTile
            label="Rata-rata Umur Pakai (jam)"
            value={analytics?.average_lifetime_hours != null ? String(analytics.average_lifetime_hours) : '-'}
            sub={(() => {
              if (!analytics) return undefined
              const base = `Dari ${analytics.installations_sampled} pemasangan tercatat`
              if (
                part.replacement_strategy === 'life_based' &&
                part.estimated_lifetime_hours &&
                analytics.average_lifetime_hours != null
              ) {
                const pct = Math.round((analytics.average_lifetime_hours / part.estimated_lifetime_hours) * 100)
                return `${base} · ${pct}% dari estimasi ${part.estimated_lifetime_hours} jam`
              }
              return base
            })()}
          />
          <StatTile
            label="Failure / Breakdown"
            value={analytics ? String(analytics.failure_breakdown_count) : '-'}
            sub="Total laporan di plant ini"
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Part Terpasang &amp; Sisa Umur Pakai</CardTitle>
        </CardHeader>
        <CardContent>
          {installationsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : activeInstallations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada unit yang sedang terpasang saat ini.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Line &rarr; Machine &rarr; Equipment</TableHead>
                  <TableHead>Tanggal Pasang</TableHead>
                  <TableHead className="text-right">Usia</TableHead>
                  <TableHead className="text-right">Sisa Umur Pakai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeInstallations.map((installation) => (
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
                    <TableCell className="text-right text-muted-foreground">{installation.age_in_days} hari</TableCell>
                    <TableCell className="text-right">
                      {installation.remaining_hours != null ? (
                        <span
                          className={cn(
                            (installation.percent_used ?? 0) >= 100
                              ? 'text-destructive'
                              : (installation.percent_used ?? 0) >= 80
                                ? 'text-warning'
                                : 'text-foreground',
                          )}
                        >
                          {installation.remaining_hours} jam ({100 - (installation.percent_used ?? 0)}%)
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Reservasi PM yang Akan Datang</CardTitle>
          </CardHeader>
          <CardContent>
            {!activeStock ? (
              <p className="text-sm text-muted-foreground">Pilih plant untuk melihat reservasi.</p>
            ) : reservationsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !reservations || reservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada WO yang akan datang yang mereservasi part ini.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {reservations.map((reservation) => (
                  <div key={reservation.task_id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{reservation.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {reservation.equipment_name} · {reservation.machine_name} · {reservation.line_name}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                      <p>{reservation.due_date ? new Date(reservation.due_date).toLocaleDateString('id-ID') : '-'}</p>
                      <p>Qty {reservation.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Riwayat Stok</CardTitle>
          </CardHeader>
          <CardContent>
            {!activeStock ? (
              <p className="text-sm text-muted-foreground">Pilih plant untuk melihat riwayat.</p>
            ) : ledgerLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !ledger || ledger.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada riwayat perubahan stok di plant ini.</p>
            ) : (
              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                {ledger.data.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{ledgerTypeLabels[entry.type] ?? entry.type}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {new Date(entry.occurred_at).toLocaleString('id-ID')} · {entry.user?.name ?? 'Sistem'}
                      </p>
                    </div>
                    <p
                      className={cn(
                        'shrink-0 font-medium tabular-nums',
                        entry.quantity_change < 0 ? 'text-destructive' : 'text-success',
                      )}
                    >
                      {entry.quantity_change > 0 ? '+' : ''}
                      {entry.quantity_change}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Supplier</CardTitle>
          {canManage && (
            <PartSupplierFormDialog
              partId={partId}
              defaultBranchId={activeBranchId ?? undefined}
              trigger={<Button size="sm">Tambah Supplier</Button>}
            />
          )}
        </CardHeader>
        <CardContent>
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
                    <TableCell className="text-right">{ps.price ? currencyFormatter.format(Number(ps.price)) : '-'}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {ps.lead_time_days != null ? `${ps.lead_time_days} hari` : '-'}
                    </TableCell>
                    <TableCell>{ps.is_preferred ? <Badge>Utama</Badge> : <Badge variant="outline">Alternatif</Badge>}</TableCell>
                    {canManage && (
                      <TableCell className="flex justify-end gap-1">
                        <PartSupplierFormDialog
                          partId={partId}
                          partSupplier={ps}
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label="Ubah supplier" title="Ubah supplier">
                              <Pencil />
                            </Button>
                          }
                        />
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={<Button variant="ghost" size="icon-sm" aria-label="Hapus supplier" title="Hapus supplier" />}
                          >
                            <Trash2 />
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
                              <AlertDialogAction onClick={() => removeSupplierMutation.mutate(ps.id)}>Hapus</AlertDialogAction>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Unit Part</CardTitle>
        </CardHeader>
        <CardContent>
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
                    <TableCell className="text-right">{unit.percent_used != null ? `${100 - unit.percent_used}%` : '-'}</TableCell>
                    <TableCell className="text-right tabular-nums">{unit.install_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
