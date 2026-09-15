import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { fetchPartUnit } from '@/features/part-units/api'
import { Breadcrumb } from '@/components/Breadcrumb'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { PartUnitStatus, PartRepairDisposition } from '@/types/relations'

const statusLabels: Record<PartUnitStatus, string> = {
  in_service: 'Terpasang',
  pending_repair: 'Menunggu Keputusan',
  in_repair: 'Sedang Diperbaiki',
  available: 'Siap Dipasang',
  scrapped: 'Dibuang',
}

const statusVariants: Record<PartUnitStatus, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  in_service: 'success',
  pending_repair: 'warning',
  in_repair: 'warning',
  available: 'secondary',
  scrapped: 'destructive',
}

const dispositionLabels: Record<PartRepairDisposition, string> = {
  pending: 'Menunggu Keputusan',
  in_repair: 'Sedang Diperbaiki',
  repaired: 'Selesai Diperbaiki',
  scrapped: 'Dibuang',
}

function formatDuration(installedAt: string, removedAt: string | null): string {
  const start = new Date(installedAt)
  const end = removedAt ? new Date(removedAt) : new Date()
  const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  return `${days} hari`
}

export function PartUnitDetailPage() {
  const { id } = useParams<{ id: string }>()
  const unitId = Number(id)

  const { data: unit, isLoading } = useQuery({
    queryKey: ['part-unit', unitId],
    queryFn: () => fetchPartUnit(unitId),
  })

  if (isLoading || !unit) {
    return <Skeleton className="h-64 w-full" />
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb
          segments={[
            { label: unit.part_name ?? 'Part', to: `/parts/${unit.part_id}` },
            { label: `Unit ${unit.unit_code}` },
          ]}
        />
        <PageHeader
          className="mt-1"
          title={`Unit ${unit.unit_code}`}
          description={`${unit.part_name} (${unit.item_master_no})`}
          action={<Badge variant={statusVariants[unit.status]}>{statusLabels[unit.status]}</Badge>}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Sisa Umur Pakai</CardTitle>
          </CardHeader>
          <CardContent>
            {unit.percent_used != null ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-semibold tabular-nums">{100 - unit.percent_used}%</span>
                <Badge variant={unit.percent_used >= 90 ? 'destructive' : 'warning'}>
                  {unit.percent_used}% terpakai
                </Badge>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">
                Part belum punya perkiraan umur pakai
              </span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Total Jam Operasional Terpakai
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-semibold tabular-nums">{unit.total_runtime_hours_used}</span>
            <span className="text-sm text-muted-foreground">
              {' '}
              / {unit.estimated_lifetime_hours ?? '-'} jam
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Jumlah Pemasangan</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-semibold tabular-nums">{unit.install_count}</span>
            <span className="text-sm text-muted-foreground"> kali</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Riwayat Pemasangan</h2>
        {!unit.installations || unit.installations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum pernah dipasang.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment / Line</TableHead>
                <TableHead>Tanggal Pasang</TableHead>
                <TableHead>Tanggal Lepas</TableHead>
                <TableHead className="text-right">Durasi</TableHead>
                <TableHead className="text-right">Jam Operasional</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unit.installations.map((installation) => (
                <TableRow key={installation.id}>
                  <TableCell>
                    <Link to={`/equipment/${installation.equipment_id}`} className="font-medium hover:underline">
                      {installation.equipment_name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {installation.machine_name} · {installation.line_name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(installation.installed_at).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {installation.removed_at
                      ? new Date(installation.removed_at).toLocaleDateString('id-ID')
                      : 'Masih terpasang'}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDuration(installation.installed_at, installation.removed_at)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {installation.age_in_runtime_hours ?? '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Riwayat Perbaikan</h2>
        {!unit.repairs || unit.repairs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum pernah dikirim ke perbaikan.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal Dilepas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal Selesai</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unit.repairs.map((repair) => (
                <TableRow key={repair.id}>
                  <TableCell className="text-muted-foreground">
                    {new Date(repair.removed_at).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell>{dispositionLabels[repair.disposition]}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {repair.repaired_at ? new Date(repair.repaired_at).toLocaleDateString('id-ID') : '-'}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground" title={repair.notes ?? ''}>
                    {repair.notes ?? '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
