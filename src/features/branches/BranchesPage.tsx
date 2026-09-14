import { useQuery } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { BranchFormDialog } from '@/features/branches/BranchFormDialog'
import { fetchBranches } from '@/features/branches/api'
import { useCanManage } from '@/stores/use-has-role'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function BranchesPage() {
  const canManage = useCanManage()

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
  })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Cabang"
        description="Daftar cabang/pabrik yang terdaftar dalam sistem."
        action={canManage && <BranchFormDialog trigger={<Button>Tambah Cabang</Button>} />}
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
                  <TableCell className="text-right">
                    <BranchFormDialog
                      branch={branch}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label="Ubah cabang" title="Ubah cabang">
                          <Pencil />
                        </Button>
                      }
                    />
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
