import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, MapPin, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { BinCell } from '@/features/locations/BinCell'
import {
  createLocation,
  createRack,
  createRackLevel,
  deleteLocation,
  deleteRack,
  deleteRackLevel,
  fetchRacks,
} from '@/features/locations/api'
import { LocationPartDrawer } from '@/features/locations/LocationPartDrawer'
import { updatePartStockLocation } from '@/features/part-stocks/api'
import { useBranchStore } from '@/stores/branch-store'
import { useCanManage } from '@/stores/use-has-role'
import type { Location, PartStock } from '@/types/inventory'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
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
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface PendingMove {
  stock: PartStock
  target: Location
}

export function LocationsPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canManage = useCanManage()
  const queryClient = useQueryClient()

  const [drawerCollapsed, setDrawerCollapsed] = useState(false)
  const [draggingStock, setDraggingStock] = useState<PartStock | null>(null)
  const [armedStock, setArmedStock] = useState<PartStock | null>(null)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)

  const { data: racks, isLoading } = useQuery({
    queryKey: ['racks', activeBranchId],
    queryFn: () => fetchRacks(activeBranchId!),
    enabled: !!activeBranchId,
  })

  function invalidateMap() {
    queryClient.invalidateQueries({ queryKey: ['racks', activeBranchId] })
  }

  const addRackMutation = useMutation({
    mutationFn: () => createRack(activeBranchId!),
    onSuccess: () => {
      invalidateMap()
      toast.success('Rak baru ditambahkan.')
    },
  })

  const addLevelMutation = useMutation({
    mutationFn: (rackId: number) => createRackLevel(rackId),
    onSuccess: () => {
      invalidateMap()
      toast.success('Tingkat baru ditambahkan.')
    },
  })

  const addBinMutation = useMutation({
    mutationFn: (rackLevelId: number) => createLocation(rackLevelId),
    onSuccess: () => {
      invalidateMap()
      toast.success('Bin baru ditambahkan.')
    },
  })

  const deleteRackMutation = useMutation({
    mutationFn: deleteRack,
    onSuccess: () => {
      invalidateMap()
      toast.success('Rak dihapus.')
    },
  })

  const deleteLevelMutation = useMutation({
    mutationFn: deleteRackLevel,
    onSuccess: () => {
      invalidateMap()
      toast.success('Tingkat dihapus.')
    },
  })

  const deleteBinMutation = useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => {
      invalidateMap()
      toast.success('Bin dihapus.')
    },
  })

  const assignMutation = useMutation({
    mutationFn: ({ partStockId, locationId }: { partStockId: number; locationId: number }) =>
      updatePartStockLocation(partStockId, locationId),
    onSuccess: (_, variables) => {
      invalidateMap()
      queryClient.invalidateQueries({ queryKey: ['part-stocks', activeBranchId] })
      toast.success('Part berhasil ditempatkan.')
      if (armedStock?.id === variables.partStockId) setArmedStock(null)
      setDraggingStock(null)
      setPendingMove(null)
    },
    onError: () => toast.error('Gagal menempatkan part ke bin ini.'),
  })

  function placeOrConfirm(stock: PartStock, target: Location) {
    if (stock.location_id && stock.location_id !== target.id) {
      setPendingMove({ stock, target })
      return
    }
    if (stock.location_id === target.id) return
    assignMutation.mutate({ partStockId: stock.id, locationId: target.id })
  }

  function handleDropOnBin(target: Location) {
    if (!draggingStock) return
    placeOrConfirm(draggingStock, target)
  }

  function handleClickBin(target: Location) {
    if (!armedStock) return
    placeOrConfirm(armedStock, target)
  }

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Lokasi (Rak & Bin)"
        description="Peta rak penyimpanan part di plant ini."
        action={
          canManage && (
            <Button onClick={() => addRackMutation.mutate()} disabled={addRackMutation.isPending}>
              <Plus />
              Tambah Rak
            </Button>
          )
        }
      />

      {armedStock && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          <span>
            Menempatkan <strong>{armedStock.part_name}</strong> — tap salah satu bin di bawah untuk memilih tujuan.
          </span>
          <Button variant="ghost" size="sm" onClick={() => setArmedStock(null)}>
            Batal
          </Button>
        </div>
      )}

      <div className="flex flex-col items-start gap-0 lg:flex-row">
        <div className={cn('min-w-0 flex-1', !drawerCollapsed && 'lg:flex-[7] lg:pr-3')}>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : !racks || racks.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="Belum ada rak di plant ini"
              description="Tambahkan rak pertama, lalu tingkat dan bin di dalamnya, untuk mulai menempatkan part."
              action={
                canManage && (
                  <Button size="sm" onClick={() => addRackMutation.mutate()}>
                    <Plus />
                    Tambah Rak
                  </Button>
                )
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {racks.map((rack) => (
                <div key={rack.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">Rak {rack.label}</h3>
                    {canManage && (
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addLevelMutation.mutate(rack.id)}
                          disabled={addLevelMutation.isPending}
                        >
                          <Plus className="size-3.5" />
                          Tingkat
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button variant="ghost" size="icon-sm" aria-label="Hapus rak" title="Hapus rak" />
                            }
                          >
                            <Trash2 className="size-3.5" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Rak {rack.label}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Semua tingkat dan bin di rak ini ikut terhapus. Part yang tersimpan di dalamnya akan
                                kehilangan lokasinya (bukan ikut terhapus).
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteRackMutation.mutate(rack.id)}>
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>

                  {rack.levels.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">Belum ada tingkat di rak ini.</p>
                  ) : (
                    <div className="mt-2 flex flex-col gap-2">
                      {/* API orders levels ascending (1 = ground); reversed here so 1 renders at the
                          bottom of the stack and each new level added appears above it, like a real rack. */}
                      {[...rack.levels].reverse().map((level) => (
                        <div key={level.id} className="rounded-md border bg-muted/30 p-2">
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                              Tingkat {level.level_number} <span className="font-mono">({level.code})</span>
                            </span>
                            {canManage && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  aria-label="Tambah bin"
                                  title="Tambah bin"
                                  onClick={() => addBinMutation.mutate(level.id)}
                                  disabled={addBinMutation.isPending}
                                >
                                  <Plus className="size-3.5" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger
                                    render={
                                      <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label="Hapus tingkat"
                                        title="Hapus tingkat"
                                      />
                                    }
                                  >
                                    <Trash2 className="size-3.5" />
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Hapus Tingkat {level.code}?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Semua bin di tingkat ini ikut terhapus. Part di dalamnya akan kehilangan
                                        lokasinya.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Batal</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteLevelMutation.mutate(level.id)}>
                                        Hapus
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </div>
                          {level.locations.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Belum ada bin di tingkat ini.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {level.locations.map((bin) => (
                                <BinCell
                                  key={bin.id}
                                  location={bin}
                                  isDragging={!!draggingStock}
                                  isArmed={!!armedStock}
                                  canManage={canManage}
                                  onDrop={() => handleDropOnBin(bin)}
                                  onClick={() => handleClickBin(bin)}
                                  onDelete={() => deleteBinMutation.mutate(bin.id)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className={cn(
            'relative flex w-full shrink-0 lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)]',
            drawerCollapsed ? 'lg:w-6' : 'lg:flex-[3]',
          )}
        >
          <button
            type="button"
            onClick={() => setDrawerCollapsed((prev) => !prev)}
            aria-label={drawerCollapsed ? 'Buka panel part' : 'Tutup panel part'}
            title={drawerCollapsed ? 'Buka panel part' : 'Tutup panel part'}
            className="absolute top-1/2 left-0 z-10 hidden size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm hover:bg-muted lg:flex"
          >
            {drawerCollapsed ? <ChevronLeft className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
          <div className={cn('w-full lg:h-full', drawerCollapsed && 'lg:hidden')}>
            <LocationPartDrawer
              hidden={false}
              branchId={activeBranchId}
              armedStockId={armedStock?.id ?? null}
              onArmPart={setArmedStock}
              onDragStartPart={setDraggingStock}
              onDragEndPart={() => setDraggingStock(null)}
            />
          </div>
        </div>
      </div>

      <AlertDialog open={!!pendingMove} onOpenChange={(open) => !open && setPendingMove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pindahkan part ke bin baru?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{pendingMove?.stock.part_name}</strong> saat ini ada di bin{' '}
              <span className="font-mono">{pendingMove?.stock.location_code}</span>. Pindahkan ke bin{' '}
              <span className="font-mono">{pendingMove?.target.code}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                pendingMove &&
                assignMutation.mutate({ partStockId: pendingMove.stock.id, locationId: pendingMove.target.id })
              }
            >
              Pindahkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
