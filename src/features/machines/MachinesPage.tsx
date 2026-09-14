import { useQuery } from '@tanstack/react-query'
import { Eye } from 'lucide-react'
import { Link } from 'react-router'
import { fetchMachinesForBranch } from '@/features/machines/api'
import { useBranchStore } from '@/stores/branch-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function MachinesPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)

  const { data: machines, isLoading } = useQuery({
    queryKey: ['machines-for-branch', activeBranchId],
    queryFn: () => fetchMachinesForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih cabang terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Mesin</h1>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : machines?.length === 0 ? (
        <p className="text-muted-foreground">Belum ada mesin di cabang ini.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Line</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {machines?.map((machine) => (
              <TableRow key={machine.id}>
                <TableCell className="font-mono text-sm">{machine.code}</TableCell>
                <TableCell className="font-medium">{machine.name}</TableCell>
                <TableCell>
                  <Link to={`/lines/${machine.line_id}`} className="text-muted-foreground hover:underline">
                    {machine.line_name ?? `Line #${machine.line_id}`}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{machine.category ?? '-'}</TableCell>
                <TableCell>
                  {machine.is_active ? (
                    <Badge variant="outline">Aktif</Badge>
                  ) : (
                    <Badge variant="secondary">Nonaktif</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    nativeButton={false}
                    aria-label="Lihat detail"
                    title="Lihat detail"
                    render={<Link to={`/machines/${machine.id}`} />}
                  >
                    <Eye />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
