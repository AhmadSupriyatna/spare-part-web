import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { addPartSupplier, fetchPartSuppliers, removePartSupplier, updatePartSupplier } from '@/features/part-suppliers/api'
import { fetchSuppliers } from '@/features/suppliers/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'

interface AssignPartSupplierSheetProps {
  partId: number
  branchId: number
  trigger: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * "Pilih Supplier" — a part can legitimately be sourced from more than one
 * supplier, so this is a list (search + click "Tempatkan"), not a single-
 * select dropdown: every branch supplier shows here, already-approved ones
 * are badged (with a "Jadikan Utama"/"Lepas" pair), everyone else just gets
 * "Tempatkan". Backed by the existing Part<->Supplier approval list
 * (PartSupplier — see PartSupplierController), not PartStock.supplier_id
 * (which only ever tracks "last received from").
 */
export function AssignPartSupplierSheet({
  partId,
  branchId,
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: AssignPartSupplierSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChangeProp ?? setInternalOpen
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers', branchId],
    queryFn: () => fetchSuppliers(branchId),
    enabled: open,
  })

  const { data: partSuppliers, isLoading: partSuppliersLoading } = useQuery({
    queryKey: ['part-suppliers', partId],
    queryFn: () => fetchPartSuppliers(partId),
    enabled: open,
  })

  const linkBySupplierId = new Map(partSuppliers?.map((ps) => [ps.supplier_id, ps]))

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['part-suppliers', partId] })
  }

  const placeMutation = useMutation({
    mutationFn: (supplierId: number) => addPartSupplier(partId, { supplier_id: supplierId }),
    onSuccess: () => {
      invalidate()
      toast.success('Supplier ditempatkan untuk part ini.')
    },
    onError: () => toast.error('Gagal menempatkan supplier.'),
  })

  const preferMutation = useMutation({
    mutationFn: (id: number) => updatePartSupplier(id, { is_preferred: true }),
    onSuccess: () => {
      invalidate()
      toast.success('Dijadikan supplier utama.')
    },
    onError: () => toast.error('Gagal menjadikan utama.'),
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => removePartSupplier(id),
    onSuccess: () => {
      invalidate()
      toast.success('Supplier dilepas dari part ini.')
    },
    onError: () => toast.error('Gagal melepas supplier.'),
  })

  const filteredSuppliers = (suppliers ?? []).filter((supplier) =>
    supplier.name.toLowerCase().includes(search.trim().toLowerCase()),
  )
  const isLoading = suppliersLoading || partSuppliersLoading

  return (
    <Sheet open={open} onOpenChange={setOpen} modal={false}>
      <SheetTrigger render={trigger as React.ReactElement} />
      <SheetContent className="gap-0 p-0" showOverlay={false}>
        <div className="flex flex-col gap-1 border-b px-4 py-4 pr-10">
          <SheetTitle>Pilih Supplier</SheetTitle>
          <SheetDescription>
            Cari supplier lalu tekan Tempatkan. Part boleh punya lebih dari satu supplier.
          </SheetDescription>
        </div>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada supplier yang cocok.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {filteredSuppliers.map((supplier) => {
                const link = linkBySupplierId.get(supplier.id)
                return (
                  <div key={supplier.id} className="flex items-center justify-between gap-2 rounded-md border p-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{supplier.name}</p>
                      {supplier.contact_person && (
                        <p className="truncate text-xs text-muted-foreground">{supplier.contact_person}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {link ? (
                        <>
                          {link.is_preferred ? (
                            <Badge className="gap-1">
                              <Star className="size-3" />
                              Utama
                            </Badge>
                          ) : (
                            <>
                              <Badge variant="outline">Ditautkan</Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => preferMutation.mutate(link.id)}
                                disabled={preferMutation.isPending}
                              >
                                Jadikan Utama
                              </Button>
                            </>
                          )}
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Lepas"
                            title="Lepas"
                            onClick={() => removeMutation.mutate(link.id)}
                            disabled={removeMutation.isPending}
                          >
                            <Trash2 />
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" onClick={() => placeMutation.mutate(supplier.id)} disabled={placeMutation.isPending}>
                          Tempatkan
                        </Button>
                      )}
                    </div>
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
