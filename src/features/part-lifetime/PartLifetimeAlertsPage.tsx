import { useQuery } from '@tanstack/react-query'
import { HeartPulse } from 'lucide-react'
import { Link } from 'react-router'
import { fetchPartLifetimeAlerts } from '@/features/part-lifetime/api'
import { ScheduleLifetimeReplacementDialog } from '@/features/part-lifetime/ScheduleLifetimeReplacementDialog'
import { useBranchStore } from '@/stores/branch-store'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function PartLifetimeAlertsPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)

  const { data: installations, isLoading } = useQuery({
    queryKey: ['part-lifetime-alerts', activeBranchId],
    queryFn: () => fetchPartLifetimeAlerts(activeBranchId!),
    enabled: !!activeBranchId,
  })

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih cabang terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Part Lifetime"
        description="Part terpasang dengan sisa umur pakai di bawah 10%, dihitung dari jam operasi line dibanding Work Order-nya. Jadwalkan penggantiannya ke Kalender PM dari sini."
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : installations?.length === 0 ? (
        <EmptyState
          icon={HeartPulse}
          title="Tidak ada part yang hampir habis umurnya"
          description="Semua part terpasang di cabang ini masih di bawah 90% dari umur pakai yang direncanakan Work Order-nya."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part</TableHead>
              <TableHead>Equipment / Line</TableHead>
              <TableHead>Terpasang Sejak</TableHead>
              <TableHead className="text-right">Sisa Umur</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {installations?.map((installation) => (
              <TableRow key={installation.id}>
                <TableCell>
                  <Link to={`/parts/${installation.part_id}`} className="font-medium hover:underline">
                    {installation.part_name}
                  </Link>
                  <div className="font-mono text-xs text-muted-foreground">
                    {installation.item_master_no}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <Link to={`/equipment/${installation.equipment_id}`} className="hover:underline">
                    {installation.equipment_name}
                  </Link>
                  <div className="text-xs">
                    {installation.machine_name} · {installation.line_name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(installation.installed_at).toLocaleDateString('id-ID')}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={(installation.percent_used ?? 0) >= 100 ? 'destructive' : 'warning'}>
                    {100 - (installation.percent_used ?? 0)}% tersisa
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <ScheduleLifetimeReplacementDialog
                    installation={installation}
                    invalidateKeys={[
                      ['pm-tasks', activeBranchId],
                      ['part-lifetime-alerts', activeBranchId],
                    ]}
                    trigger={<Button size="sm">Jadwalkan</Button>}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
