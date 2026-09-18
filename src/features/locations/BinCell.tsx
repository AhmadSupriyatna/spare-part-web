import { useQuery } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { fetchPartStocksForLocation } from '@/features/part-stocks/api'
import type { Location } from '@/types/inventory'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'

function BinContents({ locationId, open }: { locationId: number; open: boolean }) {
  const { data: stocks, isLoading } = useQuery({
    queryKey: ['part-stocks-for-location', locationId],
    queryFn: () => fetchPartStocksForLocation(locationId),
    enabled: open,
  })

  if (isLoading) return <Skeleton className="h-16 w-full" />
  if (!stocks || stocks.length === 0) {
    return <p className="px-1.5 py-1 text-xs text-muted-foreground">Bin ini masih kosong.</p>
  }

  return (
    <div className="flex flex-col gap-1">
      {stocks.map((stock) => (
        <div key={stock.id} className="flex items-center justify-between gap-2 rounded px-1.5 py-1 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium">{stock.part_name}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{stock.item_master_no}</p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">{stock.quantity_on_hand}</span>
        </div>
      ))}
    </div>
  )
}

interface BinCellProps {
  location: Location
  isDragging: boolean
  isArmed: boolean
  canManage: boolean
  onDrop: () => void
  onClick: () => void
  onDelete: () => void
}

/**
 * One Bin cell in the rack map: a drop target for a part dragged from
 * `LocationPartDrawer`, and (for touch devices, which have no native drag)
 * a tap target when a part card there has been "armed" by tapping it
 * first — same two-tap fallback pattern as elsewhere in this app. Clicking
 * without an armed/dragging part just opens the popover showing what's in
 * the bin (fetched lazily, only while open).
 */
export function BinCell({ location, isDragging, isArmed, canManage, onDrop, onClick, onDelete }: BinCellProps) {
  const [dropActive, setDropActive] = useState(false)
  const [open, setOpen] = useState(false)
  const count = location.part_stocks_count ?? 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              'flex h-14 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border text-xs transition-colors',
              dropActive &&
                'border-primary bg-primary/10 outline-2 -outline-offset-2 outline-primary/50 outline-dashed',
              isArmed && !dropActive && 'border-primary/40 hover:bg-primary/5',
              !dropActive && !isArmed && 'hover:bg-muted',
            )}
            onDragOver={(e) => {
              if (!isDragging) return
              e.preventDefault()
              e.dataTransfer.dropEffect = 'copy'
              setDropActive(true)
            }}
            onDragLeave={() => setDropActive(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDropActive(false)
              onDrop()
            }}
            onClick={() => {
              if (isArmed) {
                onClick()
                return
              }
              setOpen((prev) => !prev)
            }}
          />
        }
      >
        <span className="font-mono font-medium">B{location.bin_number}</span>
        {count > 0 && (
          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
            {count} part
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-56" side="top">
        <div className="flex items-center justify-between px-1.5 pb-1">
          <p className="font-mono text-xs font-medium">{location.code}</p>
          {canManage && count === 0 && (
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button variant="ghost" size="icon-xs" aria-label="Hapus bin" title="Hapus bin" />}
              >
                <Trash2 className="size-3" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus bin {location.code}?</AlertDialogTitle>
                  <AlertDialogDescription>Bin kosong ini akan dihapus permanen.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Hapus</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <BinContents locationId={location.id} open={open} />
      </PopoverContent>
    </Popover>
  )
}
