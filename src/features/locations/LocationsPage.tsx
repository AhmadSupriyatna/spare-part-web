import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, MapPin, Pencil, Trash2 } from 'lucide-react'
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
    return <p className="text-muted-foreground">Pilih cabang terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Lokasi (Rak/Bin)"
        description="Titik simpan fisik part di cabang ini."
        action={
          canManage && (
            <LocationFormDialog branchId={activeBranchId} trigger={<Button>Tambah Lokasi</Button>} />
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
          title="Belum ada lokasi di cabang ini"
          description="Tambahkan rak/bin supaya part bisa ditempatkan dan mudah dicari saat pengambilan."
          action={
            canManage && (
              <LocationFormDialog
                branchId={activeBranchId}
                trigger={<Button size="sm">Tambah Lokasi</Button>}
              />
            )
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Rak</TableHead>
              <TableHead>Bin</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations?.map((location) => (
              <TableRow key={location.id}>
                <TableCell className="font-mono font-medium">{location.code}</TableCell>
                <TableCell className="text-muted-foreground">{location.rack}</TableCell>
                <TableCell className="text-muted-foreground">{location.bin}</TableCell>
                <TableCell className="text-muted-foreground">{location.description ?? '-'}</TableCell>
                <TableCell>
                  {location.is_active ? (
                    <Badge variant="success">Aktif</Badge>
                  ) : (
                    <Badge variant="secondary">Nonaktif</Badge>
                  )}
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    nativeButton={false}
                    aria-label="Lihat detail"
                    title="Lihat detail"
                    render={<Link to={`/locations/${location.id}`} />}
                  >
                    <Eye />
                  </Button>
                  {canManage && (
                    <>
                      <LocationFormDialog
                        branchId={activeBranchId}
                        location={location}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Ubah lokasi"
                            title="Ubah lokasi"
                          >
                            <Pencil />
                          </Button>
                        }
                      />
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
                            <AlertDialogTitle>Hapus lokasi ini?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{location.code}" akan dihapus permanen.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(location.id)}>
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
