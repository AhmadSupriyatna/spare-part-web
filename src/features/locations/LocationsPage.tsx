import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteLocation, fetchLocations } from '@/features/locations/api'
import { LocationFormDialog } from '@/features/locations/LocationFormDialog'
import { useBranchStore } from '@/stores/branch-store'
import { useCanManage } from '@/stores/use-has-role'
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Lokasi (Rak/Bin)</h1>
        {canManage && (
          <LocationFormDialog branchId={activeBranchId} trigger={<Button>Tambah Lokasi</Button>} />
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : locations?.length === 0 ? (
        <p className="text-muted-foreground">Belum ada lokasi di cabang ini.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Rak</TableHead>
              <TableHead>Bin</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="text-right">Aksi</TableHead>}
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
                    <Badge variant="outline">Aktif</Badge>
                  ) : (
                    <Badge variant="secondary">Nonaktif</Badge>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell className="flex justify-end gap-2">
                    <LocationFormDialog
                      branchId={activeBranchId}
                      location={location}
                      trigger={
                        <Button variant="outline" size="sm">
                          Ubah
                        </Button>
                      }
                    />
                    <AlertDialog>
                      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
                        Hapus
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
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
