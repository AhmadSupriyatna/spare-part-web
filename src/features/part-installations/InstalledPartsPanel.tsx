import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HeartPulse, Pencil, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { EditInstallationNotesDialog } from '@/features/part-installations/EditInstallationNotesDialog'
import { fetchPartInstallations, removePartInstallation } from '@/features/part-installations/api'
import { useCanManage } from '@/stores/use-has-role'
import type { PartInstallation } from '@/types/relations'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface PartGroup {
  partId: number
  partName: string
  itemMasterNo: string
  installations: PartInstallation[]
}

function groupByPart(installations: PartInstallation[]): PartGroup[] {
  const groups = new Map<number, PartGroup>()
  for (const installation of installations) {
    if (!groups.has(installation.part_id)) {
      groups.set(installation.part_id, {
        partId: installation.part_id,
        partName: installation.part_name,
        itemMasterNo: installation.item_master_no,
        installations: [],
      })
    }
    groups.get(installation.part_id)!.installations.push(installation)
  }
  return Array.from(groups.values())
}

function percentBadgeVariant(percent: number): 'destructive' | 'warning' | 'success' {
  if (percent >= 100) return 'destructive'
  if (percent >= 80) return 'warning'
  return 'success'
}

/**
 * Summary of the parts currently installed on one equipment, for the
 * Line/Mesin/Equipment browser's side panel (and its floating drop-target
 * copy while the part picker sheet is open) — grouped by Part identity
 * rather than one row per physical installation, since the same part is
 * often installed as more than one unit (e.g. two bearings on one gearbox):
 * the identity (name/code) is shown once, with each unit's remaining
 * lifetime as a compact badge next to it, alongside edit/lepas actions.
 */
export function InstalledPartsPanel({ equipmentId }: { equipmentId: number }) {
  const canManage = useCanManage()
  const queryClient = useQueryClient()

  const { data: installations, isLoading } = useQuery({
    queryKey: ['part-installations', equipmentId],
    queryFn: () => fetchPartInstallations(equipmentId),
  })

  const removeMutation = useMutation({
    mutationFn: removePartInstallation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-installations', equipmentId] })
      toast.success('Part berhasil dilepas.')
    },
    onError: () => toast.error('Gagal melepas part.'),
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
            {group.installations.map((installation) => {
              const label = [
                installation.unit_code ?? '?',
                installation.percent_used != null ? `${Math.round(installation.percent_used)}%` : null,
              ]
                .filter(Boolean)
                .join(' · ')
              const badge = (
                <Badge
                  className="shrink-0 px-1.5 text-[10px]"
                  variant={installation.percent_used != null ? percentBadgeVariant(installation.percent_used) : 'outline'}
                >
                  {label}
                </Badge>
              )
              return (
                <div key={installation.id} className="flex shrink-0 items-center gap-0.5">
                  {installation.part_unit_id ? (
                    <Link to={`/part-units/${installation.part_unit_id}`} title="Lihat detail unit">
                      {badge}
                    </Link>
                  ) : (
                    badge
                  )}
                  {canManage && (
                    <>
                      <EditInstallationNotesDialog
                        installation={installation}
                        equipmentId={equipmentId}
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Ubah catatan" title="Ubah catatan">
                            <Pencil className="size-3" />
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Lepas part"
                        title="Lepas part"
                        onClick={() => removeMutation.mutate(installation.id)}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
