import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { fetchMachineMonitoring } from '@/features/machines/api'
import { MachineDashboardContent } from '@/features/machines/MachineDashboardContent'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function MachineMonitoringPage() {
  const { machineId } = useParams<{ machineId: string }>()
  const id = Number(machineId)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-machine-monitoring', id],
    queryFn: () => fetchMachineMonitoring(id),
    enabled: Number.isFinite(id),
  })

  return (
    <div className="min-h-svh bg-muted/40 p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
            <Skeleton className="h-48 w-full" />
          </>
        ) : isError || !data ? (
          <Card>
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              Mesin tidak ditemukan, atau QR ini sudah tidak berlaku.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="flex flex-col gap-1 pt-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold">{data.machine.name}</h1>
                  {!data.machine.is_active && <Badge variant="secondary">Nonaktif</Badge>}
                  {data.machine.category && <Badge variant="outline">{data.machine.category}</Badge>}
                </div>
                <p className="font-mono text-sm text-muted-foreground">{data.machine.code}</p>
                <p className="text-sm text-muted-foreground">
                  {data.machine.line_id != null
                    ? `Line ${data.machine.line_name ?? '-'}`
                    : `Luar Line — ${data.machine.branch_name ?? '-'}`}
                  {' · '}
                  {data.equipment_count} equipment
                </p>
              </CardContent>
            </Card>

            <MachineDashboardContent data={data} />
          </>
        )}
      </div>
    </div>
  )
}
