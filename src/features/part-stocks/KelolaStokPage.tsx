import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Boxes, CircleAlert, MoreVertical, PackagePlus, Pencil, Plus, Printer, QrCode, Search, SlidersHorizontal, Trash2, Truck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { AdjustStockDialog } from '@/features/part-stocks/AdjustStockDialog'
import { AssignPartSupplierSheet } from '@/features/part-stocks/AssignPartSupplierSheet'
import { fetchPartStocksForBranch } from '@/features/part-stocks/api'
import { LocationReadOnlyList } from '@/features/part-stocks/LocationReadOnlyList'
import { PartQrBulkPrintDialog } from '@/features/part-stocks/PartQrBulkPrintDialog'
import { ReceiveStockDialog } from '@/features/part-stocks/ReceiveStockDialog'
import { SetPartLocationDialog } from '@/features/part-stocks/SetPartLocationDialog'
import { StockLedgerTab } from '@/features/part-stocks/StockLedgerTab'
import { SupplierReadOnlyList } from '@/features/part-stocks/SupplierReadOnlyList'
import { deletePart, fetchParts } from '@/features/parts/api'
import { PartFormDialog } from '@/features/parts/PartFormDialog'
import { useBranchStore } from '@/stores/branch-store'
import { useCanManage } from '@/stores/use-has-role'
import type { Part, PartStock } from '@/types/inventory'
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
} from '@/components/ui/alert-dialog'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type StatusFilter = 'all' | 'critical' | 'warning' | 'reserved'

interface StockRowProps {
  stock: PartStock
  part: Part | undefined
  branchId: number
  canManage: boolean
  selected: boolean
  onToggleSelect: () => void
}

/**
 * One thin row per stock — a "list card tipis", not the earlier square
 * card grid. Every action lives behind a small "..." menu except the two
 * used constantly (Stock In / Stock Opname), which stay as visible icons.
 * Every action's own dialog/laci is rendered OUTSIDE the DropdownMenu
 * (as a sibling, controlled via `openAction`) rather than nested inside
 * DropdownMenuContent — Base UI's Menu unmounts its popup content the
 * instant an item is clicked, which would destroy an uncontrolled
 * dialog's own `open` state before it ever rendered (see the WO reschedule
 * dropdown fix earlier in this project for the same bug).
 */
function StockRow({ stock, part, branchId, canManage, selected, onToggleSelect }: StockRowProps) {
  const [openAction, setOpenAction] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const queryClient = useQueryClient()

  function actionOpenChange(key: string) {
    return (next: boolean) => setOpenAction(next ? key : (prev) => (prev === key ? null : prev))
  }

  const deleteMutation = useMutation({
    mutationFn: () => deletePart(stock.part_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      queryClient.invalidateQueries({ queryKey: ['part-stocks', branchId] })
      toast.success('Part berhasil dihapus.')
      setConfirmDeleteOpen(false)
    },
    onError: () => toast.error('Gagal menghapus part.'),
  })

  const availableClass = stock.is_critical ? 'text-destructive' : stock.is_warning ? 'text-warning' : 'text-foreground'

  return (
    <div className="grid grid-cols-[auto_1fr_70px_70px_70px_auto] items-center gap-3 border-b px-2 py-2 text-sm last:border-b-0 hover:bg-muted/40">
      <Checkbox
        checked={selected}
        onCheckedChange={onToggleSelect}
        aria-label={`Pilih ${part?.name ?? stock.part_name}`}
      />

      <div className="min-w-0">
        <Link to={`/parts/${stock.part_id}`} className="block truncate font-medium hover:underline">
          {part?.name ?? stock.part_name}
        </Link>
        <p className="truncate font-mono text-xs text-muted-foreground">{part?.item_master_no ?? stock.item_master_no}</p>
      </div>

      <p className={cn('text-right font-semibold tabular-nums', availableClass)}>{stock.available_quantity}</p>
      <p className="text-right tabular-nums text-muted-foreground">{stock.reserved_quantity}</p>
      <p className="text-right tabular-nums text-muted-foreground">{stock.active_installation_count}</p>

      <div className="flex items-center justify-end gap-0.5">
        {canManage && (
          <>
            <ReceiveStockDialog
              branchId={branchId}
              partStockId={stock.id}
              currentQuantity={stock.quantity_on_hand}
              currentUnitCost={stock.unit_cost}
              open={openAction === 'in'}
              onOpenChange={actionOpenChange('in')}
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label="Stock In" title="Stock In">
                  <PackagePlus />
                </Button>
              }
            />
            <AdjustStockDialog
              partStockId={stock.id}
              branchId={branchId}
              open={openAction === 'opname'}
              onOpenChange={actionOpenChange('opname')}
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label="Stock Opname" title="Stock Opname">
                  <SlidersHorizontal />
                </Button>
              }
            />

            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Aksi lainnya" title="Aksi lainnya" />}>
                <MoreVertical />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setOpenAction('edit')}>
                  <Pencil /> Edit Part
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenAction('supplier')}>
                  <Truck /> Pilih Supplier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenAction('location')}>
                  <Boxes /> Edit Lokasi
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenAction('qr')}>
                  <Printer /> Cetak QR
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => setConfirmDeleteOpen(true)}>
                  <Trash2 /> Hapus Part
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {part && (
              <PartFormDialog
                part={part}
                open={openAction === 'edit'}
                onOpenChange={actionOpenChange('edit')}
                trigger={<span className="hidden" aria-hidden="true" />}
              />
            )}
            <AssignPartSupplierSheet
              partId={stock.part_id}
              branchId={branchId}
              open={openAction === 'supplier'}
              onOpenChange={actionOpenChange('supplier')}
              trigger={<span className="hidden" aria-hidden="true" />}
            />
            <SetPartLocationDialog
              partId={stock.part_id}
              partStockId={stock.id}
              branchId={branchId}
              currentLocationId={stock.location_id}
              open={openAction === 'location'}
              onOpenChange={actionOpenChange('location')}
              trigger={<span className="hidden" aria-hidden="true" />}
            />
            {part && (
              <PartQrBulkPrintDialog
                parts={[part]}
                stocks={[stock]}
                branchId={branchId}
                open={openAction === 'qr'}
                onOpenChange={actionOpenChange('qr')}
                trigger={<span className="hidden" aria-hidden="true" />}
              />
            )}

            <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus part ini?</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{part?.name ?? stock.part_name}" akan dihapus permanen beserta data stoknya di semua plant.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMutation.mutate()}>Hapus</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  )
}

interface UnstockedPartRowProps {
  part: Part
  branchId: number
}

/** A catalog Part with no part_stocks row for this branch yet — folded into the same list instead of a separate "Stock In" page. */
function UnstockedPartRow({ part, branchId }: UnstockedPartRowProps) {
  return (
    <div className="grid grid-cols-[auto_1fr_70px_70px_70px_auto] items-center gap-3 border-b px-2 py-2 text-sm last:border-b-0">
      <span />
      <div className="min-w-0">
        <p className="truncate font-medium text-muted-foreground">{part.name}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{part.item_master_no}</p>
      </div>
      <span className="text-right text-muted-foreground">-</span>
      <span className="text-right text-muted-foreground">-</span>
      <span className="text-right text-muted-foreground">-</span>
      <div className="flex justify-end">
        <ReceiveStockDialog
          branchId={branchId}
          partId={part.id}
          trigger={
            <Button variant="outline" size="sm">
              <PackagePlus />
              Stock In
            </Button>
          }
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  active,
  onClick,
  tone,
}: {
  label: string
  value: number
  active: boolean
  onClick: () => void
  tone?: 'destructive' | 'warning'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted',
        active && 'border-primary bg-primary/5',
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'text-2xl font-semibold tabular-nums',
          tone === 'destructive' && 'text-destructive',
          tone === 'warning' && 'text-warning',
        )}
      >
        {value}
      </p>
    </button>
  )
}

function KelolaStokWorkspace({ activeBranchId }: { activeBranchId: number }) {
  const canManage = useCanManage()
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const { data: stocks, isLoading } = useQuery({
    queryKey: ['part-stocks', activeBranchId],
    queryFn: () => fetchPartStocksForBranch(activeBranchId),
  })

  const { data: parts } = useQuery({
    queryKey: ['parts'],
    queryFn: fetchParts,
  })

  const partById = useMemo(() => new Map(parts?.map((part) => [part.id, part])), [parts])
  const stockByPartId = useMemo(() => new Map(stocks?.map((stock) => [stock.part_id, stock])), [stocks])

  const counts = useMemo(
    () => ({
      total: stocks?.length ?? 0,
      critical: stocks?.filter((s) => s.is_critical).length ?? 0,
      warning: stocks?.filter((s) => s.is_warning).length ?? 0,
      reserved: stocks?.filter((s) => s.reserved_quantity > 0).length ?? 0,
    }),
    [stocks],
  )

  const filteredStocks = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (stocks ?? []).filter((stock) => {
      if (statusFilter === 'critical' && !stock.is_critical) return false
      if (statusFilter === 'warning' && !stock.is_warning) return false
      if (statusFilter === 'reserved' && stock.reserved_quantity <= 0) return false
      if (!query) return true
      const part = partById.get(stock.part_id)
      return (
        part?.name.toLowerCase().includes(query) ||
        part?.item_master_no.toLowerCase().includes(query) ||
        stock.location_code?.toLowerCase().includes(query)
      )
    })
  }, [stocks, partById, search, statusFilter])

  const groupedByLocation = useMemo(() => {
    const groups = new Map<string, PartStock[]>()
    for (const stock of filteredStocks) {
      const key = stock.location_code ?? 'Belum ada lokasi'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(stock)
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredStocks])

  const unstockedParts = useMemo(() => {
    if (statusFilter !== 'all') return []
    const stockedPartIds = new Set(stocks?.map((stock) => stock.part_id))
    const query = search.trim().toLowerCase()
    return (parts ?? []).filter((part) => {
      if (stockedPartIds.has(part.id)) return false
      if (!query) return true
      return part.name.toLowerCase().includes(query) || part.item_master_no.toLowerCase().includes(query)
    })
  }, [parts, stocks, search, statusFilter])

  function toggleSelect(partId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(partId)) next.delete(partId)
      else next.add(partId)
      return next
    })
  }

  const selectedParts = Array.from(selectedIds)
    .map((id) => partById.get(id))
    .filter((part): part is Part => !!part)
  const selectedStocks = selectedParts
    .map((part) => stockByPartId.get(part.id))
    .filter((stock): stock is PartStock => !!stock)

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Part" value={counts.total} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        <StatCard
          label="Kritis"
          value={counts.critical}
          active={statusFilter === 'critical'}
          onClick={() => setStatusFilter(statusFilter === 'critical' ? 'all' : 'critical')}
          tone="destructive"
        />
        <StatCard
          label="Peringatan"
          value={counts.warning}
          active={statusFilter === 'warning'}
          onClick={() => setStatusFilter(statusFilter === 'warning' ? 'all' : 'warning')}
          tone="warning"
        />
        <StatCard
          label="Direservasi"
          value={counts.reserved}
          active={statusFilter === 'reserved'}
          onClick={() => setStatusFilter(statusFilter === 'reserved' ? 'all' : 'reserved')}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama part, Item Master, atau lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <PartQrBulkPrintDialog
          parts={selectedParts}
          stocks={selectedStocks}
          branchId={activeBranchId}
          trigger={
            <Button variant="outline" disabled={selectedParts.length === 0}>
              <QrCode />
              Cetak QR Terpilih ({selectedParts.length})
            </Button>
          }
        />
        {canManage && (
          <PartFormDialog
            trigger={
              <Button>
                <Plus />
                Tambah Part Baru
              </Button>
            }
          />
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filteredStocks.length === 0 && unstockedParts.length === 0 ? (
        <EmptyState
          icon={statusFilter === 'all' ? Boxes : statusFilter === 'critical' ? CircleAlert : AlertTriangle}
          title={search || statusFilter !== 'all' ? 'Tidak ada part yang cocok' : 'Belum ada part di katalog'}
          description={
            search || statusFilter !== 'all'
              ? 'Coba kata kunci atau filter lain.'
              : 'Tambah part baru dulu lewat tombol di atas.'
          }
        />
      ) : (
        <div className="rounded-lg border">
          <div className="grid grid-cols-[auto_1fr_70px_70px_70px_auto] gap-3 border-b bg-muted/40 px-2 py-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            <span />
            <span>Item Master / Part</span>
            <span className="text-right">Tersedia</span>
            <span className="text-right">Direservasi</span>
            <span className="text-right">Terinstal</span>
            <span className="text-right">Aksi</span>
          </div>

          {groupedByLocation.map(([location, locationStocks]) => (
            <div key={location}>
              <p className="border-b bg-muted/20 px-2 py-1 text-[11px] font-medium text-muted-foreground">{location}</p>
              {locationStocks.map((stock) => (
                <StockRow
                  key={stock.id}
                  stock={stock}
                  part={partById.get(stock.part_id)}
                  branchId={activeBranchId}
                  canManage={canManage}
                  selected={selectedIds.has(stock.part_id)}
                  onToggleSelect={() => toggleSelect(stock.part_id)}
                />
              ))}
            </div>
          ))}

          {canManage && unstockedParts.length > 0 && (
            <div>
              <p className="border-b bg-muted/20 px-2 py-1 text-[11px] font-medium text-muted-foreground">Belum Ada Stok</p>
              {unstockedParts.map((part) => (
                <UnstockedPartRow key={part.id} part={part} branchId={activeBranchId} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function KelolaStokPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Kelola Stok"
        description="Posisi stok, pendaftaran part & supplier, dan riwayat keluar-masuk part di plant yang sedang aktif."
      />

      <Tabs defaultValue="workspace">
        <TabsList>
          <TabsTrigger value="workspace">Stok</TabsTrigger>
          <TabsTrigger value="ledger">Ledger Keluar-Masuk</TabsTrigger>
          <TabsTrigger value="suppliers">Supplier</TabsTrigger>
          <TabsTrigger value="locations">Lokasi</TabsTrigger>
        </TabsList>
        <TabsContent value="workspace" className="mt-4">
          <KelolaStokWorkspace activeBranchId={activeBranchId} />
        </TabsContent>
        <TabsContent value="ledger" className="mt-4">
          <StockLedgerTab branchId={activeBranchId} />
        </TabsContent>
        <TabsContent value="suppliers" className="mt-4">
          <SupplierReadOnlyList branchId={activeBranchId} />
        </TabsContent>
        <TabsContent value="locations" className="mt-4">
          <LocationReadOnlyList branchId={activeBranchId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
