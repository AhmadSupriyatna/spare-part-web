import { useQuery } from '@tanstack/react-query'
import { GripVertical, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { fetchPartStocksForBranch } from '@/features/part-stocks/api'
import type { PartStock } from '@/types/inventory'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'

function groupByCategory(stocks: PartStock[]): [string, PartStock[]][] {
  const groups = new Map<string, PartStock[]>()
  for (const stock of stocks) {
    const key = stock.category ?? 'Tanpa Kategori'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(stock)
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
}

interface LocationPartDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branchId: number
  armedStockId: number | null
  onArmPart: (stock: PartStock) => void
  onDragStartPart: (stock: PartStock) => void
  onDragEndPart: () => void
}

/**
 * Right-side drawer for placing a part into a bin — same drag-source shape
 * as PartPickerSheet (part-installations), grouped by category, search on
 * top. Native HTML5 drag-and-drop has no touch equivalent, so a part card
 * is also tappable: tapping "arms" it (highlighted), then tapping any bin
 * in the map assigns it — mirrors PartPickerSheet's click-to-select
 * fallback for shop-floor tablets. Already-placed parts show their current
 * bin as a badge, so re-dragging/re-tapping the same card moves it.
 */
export function LocationPartDrawer({
  open,
  onOpenChange,
  branchId,
  armedStockId,
  onArmPart,
  onDragStartPart,
  onDragEndPart,
}: LocationPartDrawerProps) {
  const [search, setSearch] = useState('')

  const { data: stocks, isLoading } = useQuery({
    queryKey: ['part-stocks', branchId],
    queryFn: () => fetchPartStocksForBranch(branchId),
    enabled: open,
  })

  const grouped = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filtered = (stocks ?? []).filter(
      (stock) => !term || `${stock.part_name} ${stock.item_master_no}`.toLowerCase().includes(term),
    )
    return groupByCategory(filtered)
  }, [stocks, search])

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent showOverlay={false}>
        <SheetHeader>
          <SheetTitle>Tempatkan Part</SheetTitle>
          <SheetDescription>
            Seret part ke salah satu bin di peta rak, atau tap part lalu tap bin tujuannya.
          </SheetDescription>
        </SheetHeader>
        <div className="relative shrink-0">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari part..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="-mr-4 flex flex-1 flex-col gap-4 overflow-y-auto pr-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground">Part tidak ditemukan.</p>
          ) : (
            grouped.map(([category, categoryStocks]) => (
              <div key={category} className="flex flex-col gap-1.5">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{category}</p>
                <div className="flex flex-col gap-1.5">
                  {categoryStocks.map((stock) => (
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
                      {stock.location_code && (
                        <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                          {stock.location_code}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
