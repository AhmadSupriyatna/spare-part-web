import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DepartmentFormDialog } from '@/features/departments/DepartmentFormDialog'
import { deleteDepartment, fetchDepartments } from '@/features/departments/api'
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
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

/** The FP3 request form's "Departemen" picklist — managed here instead of free text. */
export function DepartmentsPage() {
  const canManage = useCanManage()
  const queryClient = useQueryClient()

  const { data: departments, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      toast.success('Departemen berhasil dihapus.')
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Departemen"
        description="Daftar departemen yang muncul di dropdown saat mengajukan FP3."
        action={canManage && <DepartmentFormDialog trigger={<Button>Tambah Departemen</Button>} />}
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : departments?.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Belum ada departemen"
          description="Tambahkan departemen seperti Produksi atau QA supaya muncul di form Ajukan FP3."
          action={canManage && <DepartmentFormDialog trigger={<Button size="sm">Tambah Departemen</Button>} />}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Departemen</TableHead>
              {canManage && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments?.map((department) => (
              <TableRow key={department.id}>
                <TableCell className="font-medium">{department.name}</TableCell>
                {canManage && (
                  <TableCell className="flex justify-end gap-1">
                    <DepartmentFormDialog
                      department={department}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label="Ubah departemen" title="Ubah departemen">
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
                            aria-label="Hapus departemen"
                            title="Hapus departemen"
                          />
                        }
                      >
                        <Trash2 />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus departemen ini?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{department.name}" akan dihapus permanen. FP3 yang sudah memakai nama ini tidak akan
                            otomatis berubah.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(department.id)}>
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
