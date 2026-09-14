import { useQuery } from '@tanstack/react-query'
import { Eye } from 'lucide-react'
import { Link } from 'react-router'
import { Breadcrumb } from '@/components/Breadcrumb'
import { fetchEquipmentForBranch } from '@/features/equipment/api'
import { useBranchStore } from '@/stores/branch-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function EquipmentPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)

  const { data: equipmentList, isLoading } = useQuery({
    queryKey: ['equipment-for-branch', activeBranchId],
    queryFn: () => fetchEquipmentForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih cabang terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Equipment</h1>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : equipmentList?.length === 0 ? (
        <p className="text-muted-foreground">Belum ada equipment di cabang ini.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Line &rarr; Mesin</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {equipmentList?.map((equipment) => (
              <TableRow key={equipment.id}>
                <TableCell className="font-mono text-sm">{equipment.code}</TableCell>
                <TableCell className="font-medium">{equipment.name}</TableCell>
                <TableCell>
                  <Breadcrumb
                    segments={[
                      {
                        label: equipment.line_name ?? 'Line',
                        to: equipment.line_id ? `/lines/${equipment.line_id}` : undefined,
                      },
                      { label: equipment.machine_name ?? 'Mesin', to: `/machines/${equipment.machine_id}` },
                    ]}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">{equipment.category ?? '-'}</TableCell>
                <TableCell>
                  {equipment.is_active ? (
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
                    render={<Link to={`/equipment/${equipment.id}`} />}
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
