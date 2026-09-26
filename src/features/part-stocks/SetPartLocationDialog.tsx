import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Search } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { fetchLocations } from '@/features/locations/api'
import { updatePartStockLocation } from '@/features/part-stocks/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'

interface SetPartLocationDialogProps {
  partId: number
  partStockId: number
  branchId: number
  branchName?: string
  currentLocationId: number | null
  trigger: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * "Edit Lokasi" — a list (search + click "Tempatkan") instead of a
 * dropdown, same interaction shape as AssignPartSupplierSheet, even though
 * a stock only ever sits in exactly one location at a time (one part_stocks
 * row = one bin, unlike supplier which can be more than one).
 */
export function SetPartLocationDialog({
  partId,
  partStockId,
  branchId,
  branchName,
  currentLocationId,
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: SetPartLocationDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChangeProp ?? setInternalOpen
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations', branchId],
    queryFn: () => fetchLocations(branchId),
    enabled: open,
  })

  const mutation = useMutation({
    mutationFn: (locationId: number) => updatePartStockLocation(partStockId, locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part', partId] })
      queryClient.invalidateQueries({ queryKey: ['part-stocks', branchId] })
      toast.success('Lokasi part berhasil disimpan.')
      setOpen(false)
    },
    onError: () => toast.error('Gagal menyimpan lokasi.'),
  })

  const filteredLocations = (locations ?? []).filter((location) => {
    const term = search.trim().toLowerCase()
    if (!term) return true
    return location.code.toLowerCase().includes(term) || location.description?.toLowerCase().includes(term)
  })

  return (
    <Sheet open={open} onOpenChange={setOpen} modal={false}>
      <SheetTrigger render={trigger as React.ReactElement} />
      <SheetContent className="gap-0 p-0" showOverlay={false}>
        <div className="flex flex-col gap-1 border-b px-4 py-4 pr-10">
          <SheetTitle>Edit Lokasi{branchName ? ` — ${branchName}` : ''}</SheetTitle>
          <SheetDescription>Cari lokasi (rak/bin) lalu tekan Tempatkan.</SheetDescription>
        </div>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari lokasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {locationsLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filteredLocations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {locations?.length === 0
                ? 'Belum ada lokasi di plant ini. Tambah dulu lewat menu Lokasi.'
                : 'Tidak ada lokasi yang cocok.'}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {filteredLocations.map((location) => {
                const isCurrent = location.id === currentLocationId
                return (
                  <div key={location.id} className="flex items-center justify-between gap-2 rounded-md border p-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-medium">{location.code}</p>
                      {location.description && (
                        <p className="truncate text-xs text-muted-foreground">{location.description}</p>
                      )}
                    </div>
                    {isCurrent ? (
                      <Badge variant="outline" className="shrink-0 gap-1">
                        <Check className="size-3" />
                        Lokasi Saat Ini
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="shrink-0"
                        onClick={() => mutation.mutate(location.id)}
                        disabled={mutation.isPending}
                      >
                        Tempatkan
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
