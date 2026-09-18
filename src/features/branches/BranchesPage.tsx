import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArchiveRestore, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { BranchFormDialog } from '@/features/branches/BranchFormDialog'
import { archiveBranch, fetchBranches, unarchiveBranch } from '@/features/branches/api'
import { useCanManage, useIsSuperadmin } from '@/stores/use-has-role'
import { DeleteWithPasswordDialog } from '@/components/DeleteWithPasswordDialog'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function BranchesPage() {
  const canManage = useCanManage()
  const isSuperadmin = useIsSuperadmin()
  const queryClient = useQueryClient()

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
  })

  const unarchiveMutation = useMutation({
    mutationFn: unarchiveBranch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      toast.success('Plant berhasil diaktifkan kembali.')
    },
    onError: () => toast.error('Gagal mengaktifkan kembali plant.'),
  })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Plant"
        description="Daftar plant yang terdaftar dalam sistem."
        action={canManage && <BranchFormDialog trigger={<Button>Tambah Plant</Button>} />}
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches?.map((branch) => (
              <TableRow key={branch.id}>
                <TableCell className="font-mono font-medium">{branch.code}</TableCell>
                <TableCell>{branch.name}</TableCell>
                <TableCell className="text-muted-foreground">{branch.address ?? '-'}</TableCell>
                <TableCell>
                  {branch.is_active === false ? (
                    <Badge variant="secondary">Nonaktif</Badge>
                  ) : (
                    <Badge variant="success">Aktif</Badge>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell className="flex justify-end gap-1">
                    <BranchFormDialog
                      branch={branch}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label="Ubah plant" title="Ubah plant">
                          <Pencil />
                        </Button>
                      }
                    />
                    {isSuperadmin &&
                      (branch.is_active === false ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Aktifkan kembali plant"
                          title="Aktifkan kembali plant"
                          onClick={() => unarchiveMutation.mutate(branch.id)}
                          disabled={unarchiveMutation.isPending}
                        >
                          <ArchiveRestore />
                        </Button>
                      ) : (
                        <DeleteWithPasswordDialog
                          title={`Arsipkan Plant "${branch.name}"?`}
                          description="Plant ini akan berhenti muncul untuk role yang dibatasi per plant (Supervisor/Admin Spare Part/Engineer). Semua data (part, stok, supplier, dst.) tetap tersimpan utuh — bisa diaktifkan kembali kapan saja."
                          onConfirm={async (password) => {
                            await archiveBranch(branch.id, password)
                          }}
                          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['branches'] })}
                          submitLabel="Arsipkan Plant"
                          submitPendingLabel="Mengarsipkan..."
                          variant="default"
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label="Arsipkan plant" title="Arsipkan plant">
                              <Archive />
                            </Button>
                          }
                        />
                      ))}
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
