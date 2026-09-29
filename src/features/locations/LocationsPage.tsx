import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { deleteLocation, fetchLocations } from '@/features/locations/api'
import { LocationFormDialog } from '@/features/locations/LocationFormDialog'
import { useBranchStore } from '@/stores/branch-store'
import { useCanManage } from '@/stores/use-has-role'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

/**
 * Plain registration list (add/edit/delete/aktif-nonaktif) — the rack/level
 * visual map + its drag-and-drop "place a part" panel were removed: placing
 * a part into a location is now done from Kelola Stok's "Edit Lokasi"
 * action, so this page's job is purely managing which locations exist.
 */
export function LocationsPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canManage = useCanManage()
  const queryClient = useQueryClient()

  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations', activeBranchId],
    queryFn: () => fetchLocations(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', activeBranchId] })
      toast.success('Lokasi berhasil dihapus.')
    },
  })

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Lokasi"
        description="Daftar lokasi penyimpanan part di plant ini."
        action={
          canManage && (
            <LocationFormDialog
              branchId={activeBranchId}
              trigger={
                <Button>
                  <Plus />
                  Tambah Lokasi
                </Button>
              }
            />
          )
        }
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : locations?.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Belum ada lokasi di plant ini"
          description="Tambahkan lokasi pertama untuk mulai menempatkan part."
          action={
            canManage && (
              <LocationFormDialog
                branchId={activeBranchId}
                trigger={
                  <Button size="sm">
                    <Plus />
                    Tambah Lokasi
                  </Button>
                }
              />
            )
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead className="text-right">Jumlah Part</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations?.map((location) => {
              const partCount = location.part_stocks_count ?? 0
              return (
                <TableRow key={location.id}>
                  <TableCell>
                    <Link to={`/locations/${location.id}`} className="font-mono font-medium hover:underline">
                      {location.code}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{location.description ?? '-'}</TableCell>
                  <TableCell className="text-right tabular-nums">{partCount}</TableCell>
                  <TableCell>
                    {location.is_active ? (
                      <Badge variant="success">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell className="flex justify-end gap-1">
                    {canManage && (
                      <>
                        <LocationFormDialog
                          branchId={activeBranchId}
                          location={location}
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label="Ubah lokasi" title="Ubah lokasi">
                              <Pencil />
                            </Button>
                          }
                        />
                        {partCount === 0 && (
                          <AlertDialog>
                            <AlertDialogTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Hapus lokasi"
                                  title="Hapus lokasi"
                                />
                              }
                            >
                              <Trash2 />
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus lokasi {location.code}?</AlertDialogTitle>
                                <AlertDialogDescription>Lokasi kosong ini akan dihapus permanen.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(location.id)}>
                                  Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
