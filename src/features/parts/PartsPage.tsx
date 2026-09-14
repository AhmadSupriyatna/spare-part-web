import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { deletePart, fetchParts } from '@/features/parts/api'
import { PartFormDialog } from '@/features/parts/PartFormDialog'
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
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Part</h1>
        {canManage && <PartFormDialog trigger={<Button>Tambah Part</Button>} />}
      </div>

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
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Item Master</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead className="text-right">Harga</TableHead>
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
                <TableCell>
                  <Link to={`/parts/${part.id}`} className="font-medium hover:underline">
                    {part.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{part.category ?? '-'}</TableCell>
                <TableCell className="text-muted-foreground">{part.unit}</TableCell>
                <TableCell className="text-right">{currencyFormatter.format(Number(part.price))}</TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" render={<Link to={`/parts/${part.id}`} />}>
                    Lihat
                  </Button>
                  {canManage && (
                    <>
                      <PartFormDialog
                        part={part}
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
