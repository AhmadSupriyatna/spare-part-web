import { useQuery } from '@tanstack/react-query'
import { HeartPulse } from 'lucide-react'
import { Link } from 'react-router'
import { fetchPartInstallations } from '@/features/part-installations/api'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Read-only summary of the parts currently installed on one equipment —
 * name, physical unit, remaining lifetime %, and which line/machine it sits
 * on — for the Line/Mesin/Equipment browser's side panel, so switching
 * equipment shows what's on it without leaving the page.
 */
export function InstalledPartsPanel({ equipmentId }: { equipmentId: number }) {
  const { data: installations, isLoading } = useQuery({
    queryKey: ['part-installations', equipmentId],
    queryFn: () => fetchPartInstallations(equipmentId),
  })

  const active = installations?.filter((installation) => installation.is_active) ?? []

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (active.length === 0) {
    return (
      <EmptyState
        icon={HeartPulse}
        title="Belum ada part terpasang"
        description="Belum ada part yang tercatat terpasang di equipment ini."
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {active.map((installation) => (
        <div key={installation.id} className="rounded-md border p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link to={`/parts/${installation.part_id}`} className="font-medium hover:underline">
                {installation.part_name}
              </Link>
              <p className="font-mono text-xs text-muted-foreground">
                {installation.item_master_no}
                {installation.unit_code ? ` · Unit ${installation.unit_code}` : ''}
              </p>
            </div>
            {installation.percent_used != null && (
              <Badge
                variant={
                  installation.percent_used >= 100
                    ? 'destructive'
                    : installation.percent_used >= 80
                      ? 'warning'
                      : 'success'
                }
              >
                {Math.round(installation.percent_used)}% terpakai
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {installation.line_name} · {installation.machine_name}
          </p>
        </div>
      ))}
    </div>
  )
}
