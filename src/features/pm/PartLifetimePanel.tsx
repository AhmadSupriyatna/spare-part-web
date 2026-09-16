import { useQuery } from '@tanstack/react-query'
import { HeartPulse } from 'lucide-react'
import { Link } from 'react-router'
import { fetchPartLifetimeAlerts } from '@/features/part-lifetime/api'
import { ScheduleLifetimeReplacementDialog } from '@/features/part-lifetime/ScheduleLifetimeReplacementDialog'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Compact monitoring panel for Part Lifetime, embedded beside the PM
 * calendar (used to be its own page, `/part-lifetime` — folded in here
 * since everything PM-related now lives on one Maintenance page). Reuses
 * the same data/dialog the old page did, just laid out for a narrow column.
 */
export function PartLifetimePanel({ branchId }: { branchId: number }) {
  const { data: installations, isLoading } = useQuery({
    queryKey: ['part-lifetime-alerts', branchId],
    queryFn: () => fetchPartLifetimeAlerts(branchId),
  })

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div>
        <h2 className="text-sm font-medium">Life Time Part</h2>
        <p className="text-xs text-muted-foreground">Part dengan sisa umur pakai 20% atau kurang.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : installations?.length === 0 ? (
        <EmptyState icon={HeartPulse} title="Aman" description="Tidak ada part yang hampir habis umurnya." />
      ) : (
        <div className="flex max-h-[32rem] flex-col gap-2 overflow-y-auto">
          {installations?.map((installation) => (
            <div key={installation.id} className="flex flex-col gap-1.5 rounded-md border p-2.5 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to={`/parts/${installation.part_id}`} className="block truncate font-medium hover:underline">
                    {installation.part_name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {installation.equipment_name} · {installation.line_name}
                  </p>
                </div>
                <Badge variant={(installation.percent_used ?? 0) >= 100 ? 'destructive' : 'warning'} className="shrink-0">
                  {100 - (installation.percent_used ?? 0)}%
                </Badge>
              </div>
              {installation.remaining_hours != null && (
                <p className="text-xs text-muted-foreground">
                  Sisa {installation.remaining_hours} jam dari {installation.estimated_lifetime_hours} jam
                </p>
              )}
              {installation.has_scheduled_lifetime_task ? (
                <Badge variant="success" className="self-start">
                  Sudah Terjadwal
                </Badge>
              ) : (
                <ScheduleLifetimeReplacementDialog
                  installation={installation}
                  invalidateKeys={[
                    ['pm-tasks', branchId],
                    ['part-lifetime-alerts', branchId],
                  ]}
                  trigger={
                    <Button size="sm" variant="outline" className="self-start">
                      Jadwalkan
                    </Button>
                  }
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
