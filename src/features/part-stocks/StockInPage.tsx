import { useQuery } from '@tanstack/react-query'
import { PackagePlus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fetchPartStocksForBranch } from '@/features/part-stocks/api'
import { ReceiveStockDialog } from '@/features/part-stocks/ReceiveStockDialog'
import { fetchParts } from '@/features/parts/api'
import { partReplacementStrategyOptions } from '@/features/parts/schema'
import { useBranchStore } from '@/stores/branch-store'
import type { Part } from '@/types/inventory'
import type { PartStock } from '@/types/inventory'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

const strategyMeta = Object.fromEntries(partReplacementStrategyOptions.map((o) => [o.value, o]))
const strategyOrder: string[] = partReplacementStrategyOptions.map((o) => o.value)

function groupByStrategy(parts: Part[]): [string, Part[]][] {
  const groups = new Map<string, Part[]>()
  for (const part of parts) {
    const key = part.replacement_strategy
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(part)
  }
  return Array.from(groups.entries()).sort(([a], [b]) => strategyOrder.indexOf(a) - strategyOrder.indexOf(b))
}

/**
 * Standalone "Terima Barang" page — split out of Kelola Stok's drawer into
 * its own menu. The part list here is read from the full catalog
 * (fetchParts()), not from this branch's existing part_stocks rows, so a
 * part that has never been stocked in this branch before still shows up
 * and can be received for the first time (see StorePartStockRequest on the
 * backend) — the old drawer could only ever top up parts that already had
 * a stock row here.
 */
export function StockInPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const [search, setSearch] = useState('')

  const { data: parts, isLoading: partsLoading } = useQuery({
    queryKey: ['parts'],
    queryFn: fetchParts,
  })

  const { data: stocks, isLoading: stocksLoading } = useQuery({
    queryKey: ['part-stocks', activeBranchId],
    queryFn: () => fetchPartStocksForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const stockByPartId = useMemo(() => {
    const map = new Map<number, PartStock>()
    stocks?.forEach((stock) => map.set(stock.part_id, stock))
    return map
  }, [stocks])

  const grouped = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filtered = (parts ?? []).filter(
      (part) => !term || `${part.name} ${part.item_master_no}`.toLowerCase().includes(term),
    )
    return groupByStrategy(filtered)
  }, [parts, search])

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
  }

  const isLoading = partsLoading || stocksLoading

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Stock In"
        description="Cari part, lalu tap untuk mencatat penerimaan barangnya — termasuk part yang belum pernah punya stok di plant ini."
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari part..."
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground">Part tidak ditemukan.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map(([strategy, strategyParts]) => (
            <div key={strategy} className="flex flex-col gap-1.5">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {strategyMeta[strategy].label}
              </p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {strategyParts.map((part) => {
                  const stock = stockByPartId.get(part.id)
                  return (
                    <ReceiveStockDialog
                      key={part.id}
                      branchId={activeBranchId}
                      partStockId={stock?.id}
                      partId={stock ? undefined : part.id}
                      currentQuantity={stock?.quantity_on_hand ?? 0}
                      currentUnitCost={stock?.unit_cost ?? '0'}
                      trigger={
                        <button
                          type="button"
                          className="flex w-full cursor-pointer items-center gap-2 rounded-md border bg-card p-2 text-left transition-colors select-none hover:border-primary/50 hover:bg-muted"
                        >
                          <PackagePlus className="size-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{part.name}</p>
                            <p className="truncate font-mono text-xs text-muted-foreground">
                              {part.item_master_no}
                            </p>
                          </div>
                          {stock ? (
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                              {stock.quantity_on_hand} unit
                            </span>
                          ) : (
                            <Badge variant="secondary" className="shrink-0">
                              Belum ada stok
                            </Badge>
                          )}
                        </button>
                      }
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
