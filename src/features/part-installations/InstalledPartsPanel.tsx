import { useQuery } from '@tanstack/react-query'
import { HeartPulse } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { fetchPartInstallations } from '@/features/part-installations/api'
import type { PartInstallation } from '@/types/relations'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface PartGroup {
  partId: number
  partName: string
  itemMasterNo: string
  units: {
    installationId: number
    partUnitId: number | null
    unitCode: string | null
    percentUsed: number | null
  }[]
}

function groupByPart(installations: PartInstallation[]): PartGroup[] {
  const groups = new Map<number, PartGroup>()
  for (const installation of installations) {
    if (!groups.has(installation.part_id)) {
      groups.set(installation.part_id, {
        partId: installation.part_id,
        partName: installation.part_name,
        itemMasterNo: installation.item_master_no,
        units: [],
      })
    }
    groups.get(installation.part_id)!.units.push({
      installationId: installation.id,
      partUnitId: installation.part_unit_id,
      unitCode: installation.unit_code ?? null,
      percentUsed: installation.percent_used,
    })
  }
  return Array.from(groups.values())
}

function percentBadgeVariant(percent: number): 'destructive' | 'warning' | 'success' {
  if (percent >= 100) return 'destructive'
  if (percent >= 80) return 'warning'
  return 'success'
}

/**
 * Read-only summary of the parts currently installed on one equipment, for
 * the Line/Mesin/Equipment browser's side panel — grouped by Part identity
 * rather than one row per physical installation, since the same part is
 * often installed as more than one unit (e.g. two bearings on one gearbox):
 * the identity (name/code) is shown once, with each unit's remaining
 * lifetime as a compact badge next to it instead of repeating the whole
 * card per unit.
 */
export function InstalledPartsPanel({ equipmentId }: { equipmentId: number }) {
  const { data: installations, isLoading } = useQuery({
    queryKey: ['part-installations', equipmentId],
    queryFn: () => fetchPartInstallations(equipmentId),
  })

  const active = useMemo(
    () => installations?.filter((installation) => installation.is_active) ?? [],
    [installations],
  )
  const groups = useMemo(() => groupByPart(active), [active])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={HeartPulse}
        title="Belum ada part terpasang"
        description="Belum ada part yang tercatat terpasang di equipment ini."
      />
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {groups.map((group) => (
        <div key={group.partId} className="flex items-start gap-2 rounded-md border p-2">
          <div className="min-w-0 flex-[3]">
            <Link to={`/parts/${group.partId}`} className="block truncate text-sm font-medium hover:underline">
              {group.partName}
            </Link>
            <p className="truncate font-mono text-[11px] text-muted-foreground">{group.itemMasterNo}</p>
          </div>
          <div className="flex flex-1 flex-wrap justify-end gap-1">
            {group.units.map((unit) => {
              const label = [unit.unitCode ?? '?', unit.percentUsed != null ? `${Math.round(unit.percentUsed)}%` : null]
                .filter(Boolean)
                .join(' · ')
              const badge = (
                <Badge
                  className="shrink-0 px-1.5 text-[10px]"
                  variant={unit.percentUsed != null ? percentBadgeVariant(unit.percentUsed) : 'outline'}
                >
                  {label}
                </Badge>
              )
              return unit.partUnitId ? (
                <Link key={unit.installationId} to={`/part-units/${unit.partUnitId}`} title="Lihat detail unit">
                  {badge}
                </Link>
              ) : (
                <span key={unit.installationId}>{badge}</span>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
