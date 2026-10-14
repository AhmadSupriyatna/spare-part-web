import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArchiveRestore, Pencil, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { InventoryAssetsNavigation } from '@/components/InventoryAssetsNavigation'
import { BranchFormDialog } from '@/features/branches/BranchFormDialog'
import { archiveBranch, fetchBranches, unarchiveBranch } from '@/features/branches/api'
import { useCanManage, useIsSuperadmin } from '@/stores/use-has-role'
import { DeleteWithPasswordDialog } from '@/components/DeleteWithPasswordDialog'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function BranchesPage() {
  const canManage = useCanManage()
  const isSuperadmin = useIsSuperadmin()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

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
  const filteredBranches = branches?.filter((branch) =>
    [branch.code, branch.name, branch.address]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(search.trim().toLowerCase()) ?? false),
  )

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Plants"
        description="Daftar plant yang terdaftar dalam sistem."
        action={<InventoryAssetsNavigation />}
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari kode, nama, atau alamat plant"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        {canManage && (
          <BranchFormDialog
            trigger={
              <Button>
                <Plus />
                Tambah Plant
              </Button>
            }
          />
        )}
      </div>

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
            {filteredBranches?.map((branch) => (
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
            {!isLoading && filteredBranches?.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManage ? 5 : 4} className="py-8 text-center text-muted-foreground">
                  {search ? 'Tidak ada plant yang cocok dengan pencarian.' : 'Belum ada plant.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
