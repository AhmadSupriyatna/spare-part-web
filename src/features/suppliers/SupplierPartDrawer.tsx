import { useQuery } from '@tanstack/react-query'
import { GripVertical, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { fetchPartStocksForBranch } from '@/features/part-stocks/api'
import { partReplacementStrategyOptions } from '@/features/parts/schema'
import type { PartStock } from '@/types/inventory'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

const strategyMeta = Object.fromEntries(partReplacementStrategyOptions.map((o) => [o.value, o]))
const strategyOrder: string[] = partReplacementStrategyOptions.map((o) => o.value)

// Not a strategy value — there's no safe business default to fall back to
// (see schema.ts) — just a UI bucket for the (currently unreachable, since
// this endpoint always eager-loads `part`) case where replacement_strategy
// wasn't included in the response at all.
const UNKNOWN_STRATEGY_KEY = '__unknown'

function groupByStrategy(stocks: PartStock[]): [string, PartStock[]][] {
  const groups = new Map<string, PartStock[]>()
  for (const stock of stocks) {
    const key = stock.replacement_strategy ?? UNKNOWN_STRATEGY_KEY
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(stock)
  }
  return Array.from(groups.entries()).sort(([a], [b]) => strategyOrder.indexOf(a) - strategyOrder.indexOf(b))
}

interface SupplierPartDrawerProps {
  hidden: boolean
  branchId: number
  armedStockId: number | null
  onArmPart: (stock: PartStock) => void
  onDragStartPart: (stock: PartStock) => void
  onDragEndPart: () => void
}

/**
 * Right-side panel for linking a part to a supplier — same shape as
 * `LocationPartDrawer` (search, grouped by replacement strategy, native drag or
 * tap-to-"arm"-then-tap-target as a touch fallback), adapted for Supplier
 * instead of a bin. Unlike a bin, a part can be linked to more than one
 * supplier at once, so dropping/tapping here always just adds a link
 * (POST /parts/{part}/suppliers) rather than moving/replacing one — there's
 * no "already assigned here" badge on the cards the way Location has,
 * since that would need a new bulk lookup this doesn't have yet.
 */
export function SupplierPartDrawer({
  hidden,
  branchId,
  armedStockId,
  onArmPart,
  onDragStartPart,
  onDragEndPart,
}: SupplierPartDrawerProps) {
  const [search, setSearch] = useState('')

  const { data: stocks, isLoading } = useQuery({
    queryKey: ['part-stocks', branchId],
    queryFn: () => fetchPartStocksForBranch(branchId),
  })

  const grouped = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filtered = (stocks ?? []).filter(
      (stock) => !term || `${stock.part_name} ${stock.item_master_no}`.toLowerCase().includes(term),
    )
    return groupByStrategy(filtered)
  }, [stocks, search])

  useEffect(() => {
    if (hidden) setSearch('')
  }, [hidden])

  return (
    <div hidden={hidden} className="flex h-full min-h-0 flex-col gap-3 rounded-lg border bg-card p-3">
      <div>
        <h2 className="text-sm font-semibold">Tautkan Part ke Supplier</h2>
        <p className="text-xs text-muted-foreground">
          Seret part ke salah satu supplier di daftar, atau tap part lalu tap supplier tujuannya.
        </p>
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
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">Part tidak ditemukan.</p>
        ) : (
          grouped.map(([strategy, strategyStocks]) => (
            <div key={strategy} className="flex flex-col gap-1.5">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {strategyMeta[strategy]?.label ?? 'Lainnya'}
              </p>
              <div className="flex flex-col gap-1.5">
                {strategyStocks.map((stock) => (
                  <div
                    key={stock.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(stock.id))
                      e.dataTransfer.effectAllowed = 'copy'
                      onDragStartPart(stock)
                    }}
                    onDragEnd={onDragEndPart}
                    onClick={() => onArmPart(stock)}
                    className={cn(
                      'flex cursor-grab items-center gap-2 rounded-md border bg-card p-2 transition-colors select-none hover:border-primary/50 hover:bg-muted active:cursor-grabbing',
                      armedStockId === stock.id && 'border-primary bg-primary/5',
                    )}
                  >
                    <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{stock.part_name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">{stock.item_master_no}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
