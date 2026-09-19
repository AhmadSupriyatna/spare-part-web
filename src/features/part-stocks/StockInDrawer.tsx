import { PackagePlus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ReceiveStockDialog } from '@/features/part-stocks/ReceiveStockDialog'
import type { PartStock } from '@/types/inventory'
import { Input } from '@/components/ui/input'

function groupByCategory(stocks: PartStock[]): [string, PartStock[]][] {
  const groups = new Map<string, PartStock[]>()
  for (const stock of stocks) {
    const key = stock.category ?? 'Tanpa Kategori'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(stock)
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
}

interface StockInDrawerProps {
  hidden: boolean
  branchId: number
  stocks: PartStock[]
}

/**
 * Right-side panel for receiving stock — same search + category-grouped
 * shape as the Location/Supplier drawers, but the target action here is
 * opening `ReceiveStockDialog` for the tapped part rather than a drag-drop
 * assignment (there's no bin/supplier to drop onto, just a part to act on).
 * Replaces the old per-row "+" button in the stock table — searching here
 * is faster than scanning/scrolling the table for one part.
 */
export function StockInDrawer({ hidden, branchId, stocks }: StockInDrawerProps) {
  const [search, setSearch] = useState('')

  const grouped = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filtered = stocks.filter(
      (stock) => !term || `${stock.part_name} ${stock.item_master_no}`.toLowerCase().includes(term),
    )
    return groupByCategory(filtered)
  }, [stocks, search])

  useEffect(() => {
    if (hidden) setSearch('')
  }, [hidden])

  return (
    <div hidden={hidden} className="flex h-full min-h-0 flex-col gap-3 rounded-lg border bg-card p-3">
      <div>
        <h2 className="text-sm font-semibold">Terima Barang (Stock In)</h2>
        <p className="text-xs text-muted-foreground">Cari part, lalu tap untuk mencatat penerimaan barangnya.</p>
      </div>
      <div className="relative shrink-0">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari part..."
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">Part tidak ditemukan.</p>
        ) : (
          grouped.map(([category, categoryStocks]) => (
            <div key={category} className="flex flex-col gap-1.5">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{category}</p>
              <div className="flex flex-col gap-1.5">
                {categoryStocks.map((stock) => (
                  <ReceiveStockDialog
                    key={stock.id}
                    partStockId={stock.id}
                    branchId={branchId}
                    currentQuantity={stock.quantity_on_hand}
                    currentUnitCost={stock.unit_cost}
                    trigger={
                      <button
                        type="button"
                        className="flex w-full cursor-pointer items-center gap-2 rounded-md border bg-card p-2 text-left transition-colors select-none hover:border-primary/50 hover:bg-muted"
                      >
                        <PackagePlus className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{stock.part_name}</p>
                          <p className="truncate font-mono text-xs text-muted-foreground">
                            {stock.item_master_no}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {stock.quantity_on_hand} unit
                        </span>
                      </button>
                    }
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
