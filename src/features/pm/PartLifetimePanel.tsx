import { useQuery } from '@tanstack/react-query'
import { HeartPulse, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { fetchPartLifetimeAlerts } from '@/features/part-lifetime/api'
import { ScheduleLifetimeReplacementDialog } from '@/features/part-lifetime/ScheduleLifetimeReplacementDialog'
import type { PartInstallation } from '@/types/relations'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

const ALL_LINES = 'all'

/**
 * Compact monitoring panel for Part Lifetime, embedded beside the PM
 * calendar (used to be its own page, `/part-lifetime` — folded in here
 * since everything PM-related now lives on one Maintenance page). Grouped
 * by Mesin -> Equipment so a long list stays scannable, with a search box
 * and a Line filter (default "Semua Line") to narrow it down.
 */
export function PartLifetimePanel({ branchId }: { branchId: number }) {
  const [search, setSearch] = useState('')
  const [lineFilter, setLineFilter] = useState<string>(ALL_LINES)

  const { data: installations, isLoading } = useQuery({
    queryKey: ['part-lifetime-alerts', branchId],
    queryFn: () => fetchPartLifetimeAlerts(branchId),
  })

  const lineOptions = useMemo(() => {
    const map = new Map<number, string>()
    installations?.forEach((installation) => {
      if (installation.line_id != null) map.set(installation.line_id, installation.line_name ?? `Line ${installation.line_id}`)
    })
    return Array.from(map.entries())
  }, [installations])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (installations ?? []).filter((installation) => {
      if (lineFilter !== ALL_LINES && String(installation.line_id) !== lineFilter) return false
      if (!term) return true
      return `${installation.part_name} ${installation.equipment_name} ${installation.machine_name}`
        .toLowerCase()
        .includes(term)
    })
  }, [installations, search, lineFilter])

  const groupedByMachine = useMemo(() => {
    const machines = new Map<string, Map<string, PartInstallation[]>>()
    for (const installation of filtered) {
      const machineName = installation.machine_name ?? 'Tanpa Mesin'
      const equipmentName = installation.equipment_name ?? 'Tanpa Equipment'
      if (!machines.has(machineName)) machines.set(machineName, new Map())
      const equipmentMap = machines.get(machineName)!
      if (!equipmentMap.has(equipmentName)) equipmentMap.set(equipmentName, [])
      equipmentMap.get(equipmentName)!.push(installation)
    }
    return Array.from(machines.entries())
  }, [filtered])

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div>
        <h2 className="text-sm font-medium">Life Time Part</h2>
        <p className="text-xs text-muted-foreground">Part dengan sisa umur pakai 20% atau kurang.</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari part/equipment..."
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Select value={lineFilter} onValueChange={(value) => setLineFilter(value ?? ALL_LINES)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_LINES}>Semua Line</SelectItem>
            {lineOptions.map(([id, name]) => (
              <SelectItem key={id} value={String(id)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={HeartPulse} title="Aman" description="Tidak ada part yang hampir habis umurnya." />
      ) : (
        <div className="flex max-h-[32rem] flex-col gap-4 overflow-y-auto">
          {groupedByMachine.map(([machineName, equipmentMap]) => (
            <div key={machineName} className="flex flex-col gap-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{machineName}</p>
              {Array.from(equipmentMap.entries()).map(([equipmentName, items]) => (
                <div key={equipmentName} className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-foreground/80">{equipmentName}</p>
                  {items.map((installation) => (
                    <div key={installation.id} className="flex flex-col gap-1.5 rounded-md border p-2.5 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/parts/${installation.part_id}`}
                          className="min-w-0 truncate font-medium hover:underline"
                        >
                          {installation.part_name}
                        </Link>
                        <Badge
                          variant={(installation.percent_used ?? 0) >= 100 ? 'destructive' : 'warning'}
                          className="shrink-0"
                        >
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
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
