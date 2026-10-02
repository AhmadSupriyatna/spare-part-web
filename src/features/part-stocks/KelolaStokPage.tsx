import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Boxes,
  CircleAlert,
  ImageOff,
  Lock,
  MoreVertical,
  PackagePlus,
  Pencil,
  Plus,
  Printer,
  QrCode,
  ScanLine,
  Search,
  SlidersHorizontal,
  Trash2,
  Truck,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { AdjustStockDialog } from '@/features/part-stocks/AdjustStockDialog'
import { AssignPartSupplierSheet } from '@/features/part-stocks/AssignPartSupplierSheet'
import { fetchPartStocksForBranch } from '@/features/part-stocks/api'
import { PartQrBulkPrintDialog } from '@/features/part-stocks/PartQrBulkPrintDialog'
import { ReceiveStockDialog } from '@/features/part-stocks/ReceiveStockDialog'
import { SetPartLocationDialog } from '@/features/part-stocks/SetPartLocationDialog'
import { deletePart, fetchParts } from '@/features/parts/api'
import { PartFormDialog } from '@/features/parts/PartFormDialog'
import { partReplacementStrategyOptions } from '@/features/parts/schema'
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
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/EmptyState'
import { Nameplate } from '@/components/Nameplate'
import { PageHeader } from '@/components/PageHeader'
import { QueryErrorState } from '@/components/QueryErrorState'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

type StatusFilter = 'all' | 'critical' | 'warning' | 'reserved'

/**
 * Shared between every data row so columns can never drift out of alignment
 * — each row is its own CSS Grid box, so `auto`-sized columns would size
 * independently per row (the bug being fixed here). Stacks as a flex column
 * below `lg` (the fixed 466px of non-1fr columns alone is wider than a
 * phone) — the row's first and last groups use `lg:contents` so their own
 * children become direct grid items at `lg`, see StockRow/UnstockedPartRow.
 */
const ROW_GRID_CLASS = 'flex flex-col gap-1.5 lg:grid lg:grid-cols-[28px_44px_1fr_76px_88px_80px_150px] lg:items-center lg:gap-3'
const HEADER_GRID_CLASS = 'hidden lg:grid lg:grid-cols-[28px_44px_1fr_76px_88px_80px_150px] lg:items-center lg:gap-3'

const strategyMeta = Object.fromEntries(partReplacementStrategyOptions.map((o) => [o.value, o]))

/** Deterministic hue per location code, purely a visual grouping aid — deliberately kept separate from the primary/warning/destructive/success tokens so it never gets confused with stock-health color. */
const LOCATION_PALETTE = [
  'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300',
  'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-300',
  'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300',
  'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300',
  'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300',
]

function locationColorClass(label: string): string {
  let hash = 0
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) | 0
  return LOCATION_PALETTE[Math.abs(hash) % LOCATION_PALETTE.length]
}

function PartThumbnail({ part }: { part: Part | undefined }) {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
      {part?.image_url ? (
        <img src={part.image_url} alt="" className="size-full object-cover" />
      ) : (
        <ImageOff className="size-4 text-muted-foreground" />
      )}
    </div>
  )
}

function StrategyBadge({ part }: { part: Part | undefined }) {
  if (!part) return null
  const meta = strategyMeta[part.replacement_strategy]
  const Icon = meta.icon
  return (
    <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
      <Icon className="size-3" />
      {meta.label}
    </Badge>
  )
}

/** "Part Passport" — flags a part whose units are tracked individually from Stock In, so replacing it during PM requires a QR scan instead of an auto-pick. */
function PassportBadge({ part }: { part: Part | undefined }) {
  if (!part?.has_passport) return null
  return (
    <Badge variant="outline" className="shrink-0 gap-1 border-primary/30 bg-primary/5 text-[10px] text-primary">
      <ScanLine className="size-3" />
      Passport
    </Badge>
  )
}

/** Left-edge stock-health strip — a quick traffic-light read (red/amber/green) beside the numeric badges, per request. */
function healthBorderClass(stock: PartStock): string {
  if (stock.is_critical) return 'border-l-destructive'
  if (stock.is_warning) return 'border-l-warning'
  return 'border-l-success'
}

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
 *
 * While any of this row's actions is open, the row gets a highlighted
 * background + ring so it stays identifiable behind the drawer/dialog —
 * previously the row lost all visual distinction the moment the sheet
 * opened, and other identical-looking rows on a long list left no way to
 * tell which part was being edited.
 */
function StockRow({ stock, part, branchId, canManage, selected, onToggleSelect }: StockRowProps) {
  const [openAction, setOpenAction] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const queryClient = useQueryClient()
  const isActive = openAction !== null || confirmDeleteOpen

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
    <div
      className={cn(
        ROW_GRID_CLASS,
        'border-b border-l-4 px-2 py-2 text-sm last:border-b-0',
        healthBorderClass(stock),
        isActive ? 'bg-primary/5 ring-1 ring-inset ring-primary/30' : 'hover:bg-muted/40',
      )}
    >
      <div className="flex items-center gap-3 lg:contents">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          aria-label={`Pilih ${part?.name ?? stock.part_name}`}
        />

        <PartThumbnail part={part} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link to={`/parts/${stock.part_id}`} className="truncate font-medium hover:underline">
              {part?.name ?? stock.part_name}
            </Link>
            <StrategyBadge part={part} />
            <PassportBadge part={part} />
          </div>
          <p className="truncate font-mono text-xs text-muted-foreground">{part?.item_master_no ?? stock.item_master_no}</p>
        </div>
      </div>

      {/* Mobile-only labeled stats — the lg+ grid conveys the same numbers via column position (header row), but a stacked mobile row needs a label per number or they're meaningless. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 pl-[80px] text-xs lg:hidden">
        <span className={cn('tabular-nums', availableClass)}>
          Tersedia: <span className="font-semibold">{stock.available_quantity}</span>
        </span>
        <span className="tabular-nums text-muted-foreground">Direservasi: {stock.reserved_quantity}</span>
        <span className="tabular-nums text-muted-foreground">Terinstal: {stock.active_installation_count}</span>
      </div>

      <p className={cn('hidden text-right font-semibold tabular-nums lg:block', availableClass)}>{stock.available_quantity}</p>
      <p className="hidden text-right tabular-nums text-muted-foreground lg:block">{stock.reserved_quantity}</p>
      <p className="hidden text-right tabular-nums text-muted-foreground lg:block">{stock.active_installation_count}</p>

      <div className="flex items-center justify-end gap-0.5">
        {canManage && (
          <>
            <ReceiveStockDialog
              branchId={branchId}
              partId={stock.part_id}
              partName={part?.name ?? stock.part_name}
              itemMasterNo={part?.item_master_no ?? stock.item_master_no}
              hasPassport={part?.has_passport}
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
    <div className={cn(ROW_GRID_CLASS, 'border-b border-l-4 border-l-transparent px-2 py-2 text-sm last:border-b-0')}>
      <div className="flex items-center gap-3 lg:contents">
        <span />
        <PartThumbnail part={part} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-medium text-muted-foreground">{part.name}</p>
            <StrategyBadge part={part} />
            <PassportBadge part={part} />
          </div>
          <p className="truncate font-mono text-xs text-muted-foreground">{part.item_master_no}</p>
        </div>
      </div>
      <span className="hidden text-right text-muted-foreground lg:block">-</span>
      <span className="hidden text-right text-muted-foreground lg:block">-</span>
      <span className="hidden text-right text-muted-foreground lg:block">-</span>
      <div className="flex justify-end">
        <ReceiveStockDialog
          branchId={branchId}
          partId={part.id}
          partName={part.name}
          itemMasterNo={part.item_master_no}
          hasPassport={part.has_passport}
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

export function KelolaStokPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canManage = useCanManage()
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const {
    data: stocks,
    isLoading,
    isError: stocksError,
    refetch: refetchStocks,
  } = useQuery({
    queryKey: ['part-stocks', activeBranchId],
    queryFn: () => fetchPartStocksForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const {
    data: parts,
    isError: partsError,
    refetch: refetchParts,
  } = useQuery({
    queryKey: ['parts'],
    queryFn: fetchParts,
  })

  const hasError = stocksError || partsError

  function retryAll() {
    refetchStocks()
    refetchParts()
  }

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

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Kelola Stok" description="Pendaftaran part & posisi stoknya per lokasi di plant yang sedang aktif." />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Nameplate
          label="Total Part"
          value={counts.total}
          sub="Semua part terdaftar di plant ini"
          icon={Boxes}
          onClick={() => setStatusFilter('all')}
          active={statusFilter === 'all'}
        />
        <Nameplate
          label="Kritis"
          value={counts.critical}
          sub="Stok di bawah batas minimum"
          icon={CircleAlert}
          tone="destructive"
          onClick={() => setStatusFilter(statusFilter === 'critical' ? 'all' : 'critical')}
          active={statusFilter === 'critical'}
        />
        <Nameplate
          label="Peringatan"
          value={counts.warning}
          sub="Stok mendekati batas minimum"
          icon={AlertTriangle}
          tone="warning"
          onClick={() => setStatusFilter(statusFilter === 'warning' ? 'all' : 'warning')}
          active={statusFilter === 'warning'}
        />
        <Nameplate
          label="Direservasi"
          value={counts.reserved}
          sub="Sedang direservasi oleh Work Order"
          icon={Lock}
          onClick={() => setStatusFilter(statusFilter === 'reserved' ? 'all' : 'reserved')}
          active={statusFilter === 'reserved'}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama part, Item Master, atau lokasi — memfilter list di bawah"
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
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : hasError ? (
        <QueryErrorState onRetry={retryAll} title="Gagal memuat data stok" />
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
          <div
            className={cn(
              HEADER_GRID_CLASS,
              'border-b border-l-4 border-l-transparent bg-muted/40 px-2 py-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase',
            )}
          >
            <span />
            <span />
            <span>Item Master / Part</span>
            <span className="text-right">Tersedia</span>
            <span className="text-right">Direservasi</span>
            <span className="text-right">Terinstal</span>
            <span className="text-right">Aksi</span>
          </div>

          {groupedByLocation.map(([location, locationStocks]) => (
            <div key={location}>
              <p
                className={cn(
                  'mx-2 mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
                  locationColorClass(location),
                )}
              >
                {location}
              </p>
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
              <p
                className={cn(
                  'mx-2 mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
                  locationColorClass('Belum Ada Stok'),
                )}
              >
                Belum Ada Stok
              </p>
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
