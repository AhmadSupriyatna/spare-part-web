import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { Breadcrumb } from '@/components/Breadcrumb'
import { AddRuntimeDialog } from '@/features/lines/AddRuntimeDialog'
import { fetchLine } from '@/features/lines/api'
import { fetchMachines } from '@/features/machines/api'
import { MachineFormDialog } from '@/features/machines/MachineFormDialog'
import { useCanManage } from '@/stores/use-has-role'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function LineDetailPage() {
  const { id } = useParams<{ id: string }>()
  const lineId = Number(id)
  const canManage = useCanManage()

  const { data: line } = useQuery({
    queryKey: ['line', lineId],
    queryFn: () => fetchLine(lineId),
  })

  const { data: machines, isLoading } = useQuery({
    queryKey: ['machines', lineId],
    queryFn: () => fetchMachines(lineId),
  })

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        segments={[{ label: 'Line Produksi', to: '/lines' }, { label: line?.name ?? 'Line' }]}
      />
      <div>
        <h1 className="text-2xl font-semibold">{line?.name ?? 'Line'}</h1>
        {line && (
          <div className="mt-1 flex items-center gap-3">
            <p className="text-muted-foreground">
              Jam operasi saat ini: <span className="font-medium">{line.runtime_hours}</span>
            </p>
            {canManage && <AddRuntimeDialog lineId={lineId} branchId={line.branch_id} />}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Mesin</h2>
        {canManage && <MachineFormDialog lineId={lineId} trigger={<Button size="sm">Tambah Mesin</Button>} />}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : machines?.length === 0 ? (
        <p className="text-muted-foreground">Belum ada mesin di line ini.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {machines?.map((machine) => (
            <Link key={machine.id} to={`/machines/${machine.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">{machine.name}</CardTitle>
                  {!machine.is_active && <Badge variant="outline">Nonaktif</Badge>}
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  <span className="font-mono text-sm text-muted-foreground">{machine.code}</span>
                  {machine.category && (
                    <span className="text-sm text-muted-foreground">{machine.category}</span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
