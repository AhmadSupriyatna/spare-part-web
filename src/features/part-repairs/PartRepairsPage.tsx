import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Wrench } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { fetchPartRepairs, updatePartRepair } from '@/features/part-repairs/api'
import type { PartRepairDisposition } from '@/types/relations'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const dispositionLabels: Record<PartRepairDisposition, string> = {
  pending: 'Menunggu Keputusan',
  in_repair: 'Sedang Diperbaiki',
  repaired: 'Selesai Diperbaiki',
  scrapped: 'Dibuang',
}

function RepairsTable({ disposition }: { disposition: PartRepairDisposition }) {
  const queryClient = useQueryClient()

  const { data: repairs, isLoading } = useQuery({
    queryKey: ['part-repairs', disposition],
    queryFn: () => fetchPartRepairs(disposition),
  })

  const mutation = useMutation({
    mutationFn: ({ id, next }: { id: number; next: PartRepairDisposition }) =>
      updatePartRepair(id, { disposition: next }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-repairs'] })
      toast.success('Status perbaikan diperbarui.')
    },
    onError: () => toast.error('Gagal memperbarui status.'),
  })

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (repairs?.length === 0) {
    return (
      <EmptyState icon={Wrench} title={`Tidak ada unit berstatus "${dispositionLabels[disposition]}"`} />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Part / Unit</TableHead>
          <TableHead>Dilepas Dari</TableHead>
          <TableHead>Tanggal Dilepas</TableHead>
          <TableHead>Catatan</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {repairs?.map((repair) => (
          <TableRow key={repair.id}>
            <TableCell>
              <Link to={`/part-units/${repair.part_unit_id}`} className="font-medium hover:underline">
                {repair.part_name} — Unit {repair.unit_code}
              </Link>
              <p className="font-mono text-xs text-muted-foreground">{repair.item_master_no}</p>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {repair.equipment_name ?? '-'}
              {repair.equipment_name && (
                <div className="text-xs">
                  {repair.machine_name} · {repair.line_name}
                </div>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(repair.removed_at).toLocaleDateString('id-ID')}
            </TableCell>
            <TableCell className="max-w-xs truncate text-muted-foreground" title={repair.notes ?? ''}>
              {repair.notes ?? '-'}
            </TableCell>
            <TableCell className="flex justify-end gap-2">
              {disposition === 'pending' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => mutation.mutate({ id: repair.id, next: 'in_repair' })}
                  disabled={mutation.isPending}
                >
                  Mulai Perbaikan
                </Button>
              )}
              {(disposition === 'pending' || disposition === 'in_repair') && (
                <>
                  <Button
                    size="sm"
                    onClick={() => mutation.mutate({ id: repair.id, next: 'repaired' })}
                    disabled={mutation.isPending}
                  >
                    Selesai Diperbaiki
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => mutation.mutate({ id: repair.id, next: 'scrapped' })}
                    disabled={mutation.isPending}
                  >
                    Buang
                  </Button>
                </>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function PartRepairsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Perbaikan Part"
        description="Unit part yang sudah dilepas dari equipment — kelola apakah diperbaiki dan dipasang lagi, atau dibuang permanen."
      />

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Menunggu</TabsTrigger>
          <TabsTrigger value="in_repair">Sedang Diperbaiki</TabsTrigger>
          <TabsTrigger value="repaired">Selesai</TabsTrigger>
          <TabsTrigger value="scrapped">Dibuang</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <RepairsTable disposition="pending" />
        </TabsContent>
        <TabsContent value="in_repair" className="mt-4">
          <RepairsTable disposition="in_repair" />
        </TabsContent>
        <TabsContent value="repaired" className="mt-4">
          <RepairsTable disposition="repaired" />
        </TabsContent>
        <TabsContent value="scrapped" className="mt-4">
          <RepairsTable disposition="scrapped" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
