import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteUnit, fetchUnits } from '@/features/units/api'
import { UnitFormDialog } from '@/features/units/UnitFormDialog'
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
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function UnitsPage() {
  const canManage = useCanManage()
  const queryClient = useQueryClient()

  const { data: units, isLoading } = useQuery({
    queryKey: ['units'],
    queryFn: fetchUnits,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      toast.success('Satuan berhasil dihapus.')
    },
    onError: () => {
      toast.error('Gagal menghapus — mungkin satuan ini masih dipakai oleh part.')
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Satuan Part</h1>
          <p className="text-sm text-muted-foreground">
            Daftar satuan yang muncul di dropdown saat menambah atau mengubah part.
          </p>
        </div>
        {canManage && <UnitFormDialog trigger={<Button>Tambah Satuan</Button>} />}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : units?.length === 0 ? (
        <p className="text-muted-foreground">Belum ada satuan.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Satuan</TableHead>
              {canManage && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {units?.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell className="font-medium">{unit.name}</TableCell>
                {canManage && (
                  <TableCell className="flex justify-end gap-1">
                    <UnitFormDialog
                      unit={unit}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label="Ubah satuan" title="Ubah satuan">
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
                            aria-label="Hapus satuan"
                            title="Hapus satuan"
                          />
                        }
                      >
                        <Trash2 />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus satuan ini?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{unit.name}" akan dihapus permanen. Part yang sudah memakai satuan ini
                            tidak akan otomatis berubah.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(unit.id)}>
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
