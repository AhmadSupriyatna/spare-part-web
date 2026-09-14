import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, Package, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { deletePart, fetchParts } from '@/features/parts/api'
import { PartFormDialog } from '@/features/parts/PartFormDialog'
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
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function PartsPage() {
  const [search, setSearch] = useState('')
  const canManage = useCanManage()
  const queryClient = useQueryClient()

  const { data: parts, isLoading } = useQuery({
    queryKey: ['parts'],
    queryFn: fetchParts,
  })

  const deleteMutation = useMutation({
    mutationFn: deletePart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      toast.success('Part berhasil dihapus.')
    },
  })

  const filteredParts = parts?.filter(
    (part) =>
      part.name.toLowerCase().includes(search.toLowerCase()) ||
      part.item_master_no.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Part"
        description="Katalog part bersama, dipakai di seluruh cabang."
        action={canManage && <PartFormDialog trigger={<Button>Tambah Part</Button>} />}
      />

      <Input
        placeholder="Cari nama atau Item Master..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : filteredParts?.length === 0 ? (
        <EmptyState
          icon={Package}
          title={search ? 'Tidak ada part yang cocok' : 'Belum ada part'}
          description={
            search
              ? 'Coba kata kunci lain, atau hapus pencarian untuk melihat semua part.'
              : 'Tambahkan part pertama untuk mulai mengelola katalog dan stok.'
          }
          action={!search && canManage && <PartFormDialog trigger={<Button size="sm">Tambah Part</Button>} />}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Item Master</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredParts?.map((part) => (
              <TableRow key={part.id}>
                <TableCell>
                  {part.image_url ? (
                    <img
                      src={part.image_url}
                      alt={part.name}
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted" />
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm">{part.item_master_no}</TableCell>
                <TableCell className="font-medium">{part.name}</TableCell>
                <TableCell className="text-muted-foreground">{part.category ?? '-'}</TableCell>
                <TableCell className="text-muted-foreground">{part.unit}</TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    nativeButton={false}
                    aria-label="Lihat detail"
                    title="Lihat detail"
                    render={<Link to={`/parts/${part.id}`} />}
                  >
                    <Eye />
                  </Button>
                  {canManage && (
                    <>
                      <PartFormDialog
                        part={part}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Ubah part"
                            title="Ubah part"
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
                              aria-label="Hapus part"
                              title="Hapus part"
                            />
                          }
                        >
                          <Trash2 />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus part ini?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{part.name}" akan dihapus permanen beserta data stoknya di semua cabang.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(part.id)}>
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
