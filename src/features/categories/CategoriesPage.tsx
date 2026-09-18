import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Tag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { CategoryFormDialog } from '@/features/categories/CategoryFormDialog'
import { deleteCategory, fetchCategories } from '@/features/categories/api'
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

export function CategoriesPage() {
  const canManage = useCanManage()
  const queryClient = useQueryClient()

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Kategori berhasil dihapus.')
    },
    onError: () => {
      toast.error('Gagal menghapus kategori.')
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Kategori Part"
        description="Daftar kategori yang muncul di dropdown saat menambah atau mengubah part."
        action={canManage && <CategoryFormDialog trigger={<Button>Tambah Kategori</Button>} />}
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : categories?.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Belum ada kategori"
          description="Tambahkan kategori seperti Elektrikal atau Mekanikal supaya muncul di dropdown form Part."
          action={canManage && <CategoryFormDialog trigger={<Button size="sm">Tambah Kategori</Button>} />}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Kategori</TableHead>
              {canManage && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories?.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                {canManage && (
                  <TableCell className="flex justify-end gap-1">
                    <CategoryFormDialog
                      category={category}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label="Ubah kategori" title="Ubah kategori">
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
                            aria-label="Hapus kategori"
                            title="Hapus kategori"
                          />
                        }
                      >
                        <Trash2 />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus kategori ini?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{category.name}" akan dihapus permanen. Part yang sudah memakai kategori ini
                            tidak akan otomatis berubah.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(category.id)}>
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
