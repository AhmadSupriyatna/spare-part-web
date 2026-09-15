import { useQuery } from '@tanstack/react-query'
import { GripVertical, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fetchParts } from '@/features/parts/api'
import type { Part } from '@/types/inventory'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface PartPickerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPickPart: (part: Part) => void
  onDragStartPart: (part: Part) => void
  onDragEndPart: () => void
}

function groupByCategory(parts: Part[]): [string, Part[]][] {
  const groups = new Map<string, Part[]>()
  for (const part of parts) {
    const key = part.category ?? 'Tanpa Kategori'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(part)
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
}

/**
 * Right-side drawer of draggable parts, grouped by category. Dragging a row
 * onto the "Part" drop zone in LineHierarchyPage starts an install; clicking
 * a row does the same thing directly, since native HTML5 drag-and-drop has
 * no touch-device equivalent and this is used on shop-floor tablets.
 */
export function PartPickerSheet({ open, onOpenChange, onPickPart, onDragStartPart, onDragEndPart }: PartPickerSheetProps) {
  const [search, setSearch] = useState('')
  const { data: parts, isLoading } = useQuery({ queryKey: ['parts'], queryFn: fetchParts, enabled: open })

  const grouped = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filtered = (parts ?? []).filter(
      (part) => !term || `${part.name} ${part.item_master_no}`.toLowerCase().includes(term),
    )
    return groupByCategory(filtered)
  }, [parts, search])

  return (
    // Non-modal, no overlay: the drop zone on the rest of the page must stay
    // visible and interactive while this sheet is open.
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent showOverlay={false}>
        <SheetHeader>
          <SheetTitle>Pasang Part</SheetTitle>
          <SheetDescription>Seret salah satu part ke kotak "Part" di sebelah kiri untuk memasangnya.</SheetDescription>
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
            grouped.map(([category, categoryParts]) => (
              <div key={category} className="flex flex-col gap-1.5">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{category}</p>
                <div className="flex flex-col gap-1.5">
                  {categoryParts.map((part) => (
                    <div
                      key={part.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', String(part.id))
                        e.dataTransfer.effectAllowed = 'copy'
                        onDragStartPart(part)
                      }}
                      onDragEnd={onDragEndPart}
                      onClick={() => onPickPart(part)}
                      className="flex cursor-grab items-center gap-2 rounded-md border bg-card p-2 transition-colors select-none hover:border-primary/50 hover:bg-muted active:cursor-grabbing"
                    >
                      <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{part.name}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">{part.item_master_no}</p>
                      </div>
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
