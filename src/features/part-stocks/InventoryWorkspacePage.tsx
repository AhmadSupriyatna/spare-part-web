import { useQuery } from '@tanstack/react-query'
import { Boxes, History, MapPin, PackagePlus, Pencil, Plus, Search, SlidersHorizontal, Truck } from 'lucide-react'
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
import { LocationsPage } from '@/features/locations/LocationsPage'
import { SuppliersPage } from '@/features/suppliers/SuppliersPage'
import { useBranchStore } from '@/stores/branch-store'
import { useCanManage } from '@/stores/use-has-role'
import type { Part, PartStock } from '@/types/inventory'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function statusBadge(stock: PartStock) {
  if (stock.is_critical) return <Badge variant="destructive">Kritis</Badge>
  if (stock.is_warning) return <Badge variant="warning">Peringatan</Badge>
  return <Badge variant="success">Normal</Badge>
}

interface StockCardProps {
  stock: PartStock
  part: Part | undefined
  branchId: number
  canManage: boolean
}

function StockCard({ stock, part, branchId, canManage }: StockCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link to={`/stock/${stock.id}`} className="truncate font-medium hover:underline">
            {part?.name ?? stock.part_name}
          </Link>
          <p className="font-mono text-xs text-muted-foreground">{part?.item_master_no ?? stock.item_master_no}</p>
        </div>
        {statusBadge(stock)}
      </div>

      {part?.description && <p className="line-clamp-2 text-xs text-muted-foreground">{part.description}</p>}

      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="size-3" />
        {stock.location_code ?? 'Belum ada lokasi'}
        {stock.supplier_name && <span> · {stock.supplier_name}</span>}
      </p>

      <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-2">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Qty Tersedia</p>
          <p className="text-lg font-semibold tabular-nums">{stock.available_quantity}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Qty Direservasi</p>
          <p className="text-lg font-semibold tabular-nums text-muted-foreground">{stock.reserved_quantity}</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t pt-2">
        {canManage ? (
          <div className="flex flex-wrap items-center gap-0.5">
            <ReceiveStockDialog
              branchId={branchId}
              partStockId={stock.id}
              currentQuantity={stock.quantity_on_hand}
              currentUnitCost={stock.unit_cost}
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label="Stock In" title="Stock In">
                  <PackagePlus />
                </Button>
              }
            />
            <AdjustStockDialog
              partStockId={stock.id}
              branchId={branchId}
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label="Stock Opname" title="Stock Opname">
                  <SlidersHorizontal />
                </Button>
              }
            />
            {part && (
              <PartFormDialog
                part={part}
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label="Edit Part" title="Edit Part">
                    <Pencil />
                  </Button>
                }
              />
            )}
            <SetPartSupplierDialog
              partStockId={stock.id}
              branchId={branchId}
              currentSupplierId={stock.supplier_id}
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label="Pilih Supplier" title="Pilih Supplier">
                  <Truck />
                </Button>
              }
            />
            <SetPartLocationDialog
              partId={stock.part_id}
              partStockId={stock.id}
              branchId={branchId}
              currentLocationId={stock.location_id}
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label="Edit Lokasi" title="Edit Lokasi">
                  <MapPin />
                </Button>
              }
            />
          </div>
        ) : (
          <span />
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          aria-label="Riwayat"
          title="Riwayat"
          render={<Link to={`/stock/${stock.id}`} />}
        >
          <History />
        </Button>
      </div>
    </div>
  )
}

interface UnstockedPartCardProps {
  part: Part
  branchId: number
}

/**
 * A catalog Part with no part_stocks row for this branch yet — folded
 * straight into the workspace grid instead of a separate "Stock In" page
 * (dissolved per request), so bringing a never-before-stocked part in is
 * still just as reachable, one Stock In away.
 */
function UnstockedPartCard({ part, branchId }: UnstockedPartCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-muted-foreground">{part.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{part.item_master_no}</p>
        </div>
        <Badge variant="secondary">Belum Ada Stok</Badge>
      </div>
      {part.description && <p className="line-clamp-2 text-xs text-muted-foreground">{part.description}</p>}
      <ReceiveStockDialog
        branchId={branchId}
        partId={part.id}
        trigger={
          <Button variant="outline" size="sm" className="justify-center">
            <PackagePlus />
            Stock In
          </Button>
        }
      />
    </div>
  )
}

function InventoryWorkspace({ activeBranchId }: { activeBranchId: number }) {
  const canManage = useCanManage()
  const [search, setSearch] = useState('')

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

  const unstockedParts = useMemo(() => {
    const stockedPartIds = new Set(stocks?.map((stock) => stock.part_id))
    const query = search.trim().toLowerCase()
    return (parts ?? []).filter((part) => {
      if (stockedPartIds.has(part.id)) return false
      if (!query) return true
      return part.name.toLowerCase().includes(query) || part.item_master_no.toLowerCase().includes(query)
    })
  }, [parts, stocks, search])

  return (
    <div className="flex flex-col gap-3">
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : filteredStocks.length === 0 && unstockedParts.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={search ? 'Tidak ada part yang cocok' : 'Belum ada part di katalog'}
          description={
            search
              ? 'Coba kata kunci lain, atau hapus pencarian.'
              : 'Tambah part baru dulu lewat tombol di atas.'
          }
        />
      ) : (
        <>
          {filteredStocks.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredStocks.map((stock) => (
                <StockCard
                  key={stock.id}
                  stock={stock}
                  part={partById.get(stock.part_id)}
                  branchId={activeBranchId}
                  canManage={canManage}
                />
              ))}
            </div>
          )}

          {canManage && unstockedParts.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Belum Ada Stok di Plant Ini
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {unstockedParts.map((part) => (
                  <UnstockedPartCard key={part.id} part={part} branchId={activeBranchId} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
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
          <TabsTrigger value="suppliers">Supplier</TabsTrigger>
          <TabsTrigger value="locations">Lokasi</TabsTrigger>
        </TabsList>
        <TabsContent value="workspace" className="mt-4">
          <InventoryWorkspace activeBranchId={activeBranchId} />
        </TabsContent>
        <TabsContent value="ledger" className="mt-4">
          <StockLedgerTab branchId={activeBranchId} />
        </TabsContent>
        <TabsContent value="suppliers" className="mt-4">
          <SuppliersPage />
        </TabsContent>
        <TabsContent value="locations" className="mt-4">
          <LocationsPage />
        </TabsContent>
      </Tabs>
    </div>
  )
}
