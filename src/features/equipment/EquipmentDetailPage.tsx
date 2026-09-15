import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/Breadcrumb'
import { fetchEquipment } from '@/features/equipment/api'
import { PartInstallationFormDialog } from '@/features/part-installations/PartInstallationFormDialog'
import { fetchPartInstallations, removePartInstallation } from '@/features/part-installations/api'
import { SendToRepairDialog } from '@/features/part-repairs/SendToRepairDialog'
import { useCanManage } from '@/stores/use-has-role'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const equipmentId = Number(id)
  const canManage = useCanManage()
  const queryClient = useQueryClient()

  const { data: equipment } = useQuery({
    queryKey: ['equipment-detail', equipmentId],
    queryFn: () => fetchEquipment(equipmentId),
  })

  const { data: installations, isLoading: installationsLoading } = useQuery({
    queryKey: ['part-installations', equipmentId],
    queryFn: () => fetchPartInstallations(equipmentId),
  })

  const removeInstallationMutation = useMutation({
    mutationFn: removePartInstallation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-installations', equipmentId] })
      toast.success('Part berhasil dilepas.')
    },
  })

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Breadcrumb
          segments={[
            { label: 'Line Produksi', to: '/lines' },
            ...(equipment
              ? [
                  { label: equipment.line_name ?? 'Line', to: `/lines?line=${equipment.line_id}` },
                  {
                    label: equipment.machine_name ?? 'Mesin',
                    to: `/lines?line=${equipment.line_id}&machine=${equipment.machine_id}`,
                  },
                ]
              : []),
            { label: equipment?.name ?? 'Equipment' },
          ]}
        />
        <h1 className="mt-1 text-2xl font-semibold">{equipment?.name ?? 'Equipment'}</h1>
        <p className="font-mono text-sm text-muted-foreground">{equipment?.code}</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Riwayat Pemasangan Part</h2>
          {canManage && (
            <PartInstallationFormDialog
              equipmentId={equipmentId}
              trigger={<Button size="sm">Pasang Part</Button>}
            />
          )}
        </div>
        {installationsLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : installations?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada part yang tercatat terpasang di equipment ini.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Tanggal Pasang</TableHead>
                <TableHead className="text-right">Usia</TableHead>
                <TableHead className="text-right">Pemakaian</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {installations?.map((installation) => (
                <TableRow key={installation.id}>
                  <TableCell>
                    <Link to={`/parts/${installation.part_id}`} className="font-medium hover:underline">
                      {installation.part_name}
                    </Link>
                    <p className="font-mono text-xs text-muted-foreground">{installation.item_master_no}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {installation.part_unit_id ? (
                      <Link to={`/part-units/${installation.part_unit_id}`} className="hover:underline">
                        Unit {installation.unit_code}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(installation.installed_at).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {installation.age_in_days} hari
                  </TableCell>
                  <TableCell className="text-right">
                    {installation.percent_used != null ? (
                      <Badge
                        variant={
                          installation.percent_used >= 100
                            ? 'destructive'
                            : installation.percent_used >= 80
                              ? 'warning'
                              : 'success'
                        }
                      >
                        {Math.round(installation.percent_used)}%
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {installation.is_active ? (
                      <Badge variant="success">Terpasang</Badge>
                    ) : (
                      <Badge variant="secondary">Dilepas</Badge>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="flex justify-end gap-2">
                      {installation.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeInstallationMutation.mutate(installation.id)}
                          disabled={removeInstallationMutation.isPending}
                        >
                          Lepas
                        </Button>
                      )}
                      {!installation.is_active && installation.part_unit_id && (
                        <SendToRepairDialog
                          partUnitId={installation.part_unit_id}
                          partInstallationId={installation.id}
                          invalidateKeys={[['part-installations', equipmentId]]}
                          trigger={
                            <Button variant="outline" size="sm">
                              Kirim ke Perbaikan
                            </Button>
                          }
                        />
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
