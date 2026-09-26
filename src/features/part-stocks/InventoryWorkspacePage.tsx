import { useQuery } from '@tanstack/react-query'
import { Boxes, MapPin, Plus, Search, SlidersHorizontal, Truck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { AdjustStockDialog } from '@/features/part-stocks/AdjustStockDialog'
import { fetchPartStocksForBranch } from '@/features/part-stocks/api'
import { ReceiveStockDialog } from '@/features/part-stocks/ReceiveStockDialog'
import { SetPartLocationDialog } from '@/features/part-stocks/SetPartLocationDialog'
import { SetPartSupplierDialog } from '@/features/part-stocks/SetPartSupplierDialog'
import { StockLedgerTab } from '@/features/part-stocks/StockLedgerTab'
import { fetchParts } from '@/features/parts/api'
import { PartFormDialog } from '@/features/parts/PartFormDialog'
import { useBranchStore } from '@/stores/branch-store'
import { useCanManage } from '@/stores/use-has-role'
import type { Part, PartStock } from '@/types/inventory'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function statusBadge(stock: PartStock) {
  if (stock.is_critical) return <Badge variant="destructive">Kritis</Badge>
  if (stock.is_below_reorder_point) return <Badge variant="warning">Rendah</Badge>
  return <Badge variant="success">Normal</Badge>
}

interface StockCardProps {
  stock: PartStock
  part: Part | undefined
  isSelected: boolean
  onClick: () => void
}

function StockCard({ stock, part, isSelected, onClick }: StockCardProps) {
  const available = Math.max(0, stock.quantity_on_hand - stock.reserved_quantity)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted',
        isSelected && 'border-primary bg-primary/5',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn('truncate font-medium', isSelected && 'text-primary')}>{part?.name ?? stock.part_name}</p>
          <p className="font-mono text-xs text-muted-foreground">{part?.item_master_no ?? stock.item_master_no}</p>
        </div>
        {statusBadge(stock)}
      </div>

      {part?.description && <p className="line-clamp-2 text-xs text-muted-foreground">{part.description}</p>}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="size-3" />
          {stock.location_code ?? 'Belum ada lokasi'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-2">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Qty Tersedia</p>
          <p className="text-lg font-semibold tabular-nums">{available}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Qty Direservasi</p>
          <p className="text-lg font-semibold tabular-nums text-muted-foreground">{stock.reserved_quantity}</p>
        </div>
      </div>
    </button>
  )
}

interface WorkspacePanelProps {
  stock: PartStock | undefined
  part: Part | undefined
  branchId: number
  canManage: boolean
}

function WorkspacePanel({ stock, part, branchId, canManage }: WorkspacePanelProps) {
  if (!stock) {
    return (
      <div className="rounded-lg border p-6">
        <EmptyState icon={Boxes} title="Pilih part" description="Pilih salah satu part di kiri untuk melihat aksi yang tersedia." />
      </div>
    )
  }

  const available = Math.max(0, stock.quantity_on_hand - stock.reserved_quantity)

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div>
        <h2 className="font-medium">{part?.name ?? stock.part_name}</h2>
        <p className="font-mono text-xs text-muted-foreground">{part?.item_master_no ?? stock.item_master_no}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Qty Tersedia</p>
          <p className="text-xl font-semibold tabular-nums">{available}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Qty Direservasi</p>
          <p className="text-xl font-semibold tabular-nums">{stock.reserved_quantity}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Lokasi</p>
          <p className="font-medium">{stock.location_code ?? '-'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Supplier</p>
          <p className="font-medium">{stock.supplier_name ?? '-'}</p>
        </div>
      </div>

      {canManage && (
        <div className="flex flex-col gap-2">
          <ReceiveStockDialog
            branchId={branchId}
            partStockId={stock.id}
            currentQuantity={stock.quantity_on_hand}
            currentUnitCost={stock.unit_cost}
            trigger={<Button className="justify-start">Stock In</Button>}
          />
          <AdjustStockDialog
            partStockId={stock.id}
            branchId={branchId}
            trigger={
              <Button variant="outline" className="justify-start">
                <SlidersHorizontal />
                Stock Opname
              </Button>
            }
          />
          {part && (
            <PartFormDialog
              part={part}
              trigger={
                <Button variant="outline" className="justify-start">
                  Edit Part
                </Button>
              }
            />
          )}
          <SetPartSupplierDialog
            partStockId={stock.id}
            branchId={branchId}
            currentSupplierId={stock.supplier_id}
            trigger={
              <Button variant="outline" className="justify-start">
                <Truck />
                Pilih Supplier
              </Button>
            }
          />
          <SetPartLocationDialog
            partId={stock.part_id}
            partStockId={stock.id}
            branchId={branchId}
            currentLocationId={stock.location_id}
            trigger={
              <Button variant="outline" className="justify-start">
                <MapPin />
                Edit Lokasi
              </Button>
            }
          />
        </div>
      )}

      <Link to={`/stock/${stock.id}`} className="text-sm text-primary hover:underline">
        Lihat riwayat lengkap →
      </Link>
    </div>
  )
}

function InventoryWorkspace({ activeBranchId }: { activeBranchId: number }) {
  const canManage = useCanManage()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const { data: stocks, isLoading } = useQuery({
    queryKey: ['part-stocks', activeBranchId],
    queryFn: () => fetchPartStocksForBranch(activeBranchId),
  })

  const { data: parts } = useQuery({
    queryKey: ['parts'],
    queryFn: fetchParts,
  })

  const partById = useMemo(() => new Map(parts?.map((part) => [part.id, part])), [parts])

  const filteredStocks = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (stocks ?? []).filter((stock) => {
      const part = partById.get(stock.part_id)
      if (!query) return true
      return (
        part?.name.toLowerCase().includes(query) ||
        part?.item_master_no.toLowerCase().includes(query) ||
        stock.location_code?.toLowerCase().includes(query)
      )
    })
  }, [stocks, partById, search])

  const selectedStock = stocks?.find((stock) => stock.id === selectedId)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[65fr_35fr]">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama part, Item Master, atau lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : filteredStocks.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={search ? 'Tidak ada stok yang cocok' : 'Belum ada stok di plant ini'}
            description={
              search
                ? 'Coba kata kunci lain, atau hapus pencarian untuk melihat semua stok.'
                : 'Stok akan muncul di sini setelah part diterima untuk plant ini.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredStocks.map((stock) => (
              <StockCard
                key={stock.id}
                stock={stock}
                part={partById.get(stock.part_id)}
                isSelected={stock.id === selectedId}
                onClick={() => setSelectedId(stock.id === selectedId ? null : stock.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {canManage && (
          <PartFormDialog
            trigger={
              <Button className="justify-center">
                <Plus />
                Tambah Part Baru
              </Button>
            }
          />
        )}
        <WorkspacePanel stock={selectedStock} part={selectedStock && partById.get(selectedStock.part_id)} branchId={activeBranchId} canManage={canManage} />
      </div>
    </div>
  )
}

export function InventoryWorkspacePage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Inventory Workspace"
        description="Posisi stok, dan riwayat keluar-masuk part di plant yang sedang aktif."
      />

      <Tabs defaultValue="workspace">
        <TabsList>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="ledger">Ledger Keluar-Masuk</TabsTrigger>
        </TabsList>
        <TabsContent value="workspace" className="mt-4">
          <InventoryWorkspace activeBranchId={activeBranchId} />
        </TabsContent>
        <TabsContent value="ledger" className="mt-4">
          <StockLedgerTab branchId={activeBranchId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
