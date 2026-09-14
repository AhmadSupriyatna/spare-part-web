import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { AddRuntimeDialog } from '@/features/machines/AddRuntimeDialog'
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

  const { data: machines, isLoading } = useQuery({
    queryKey: ['machines', lineId],
    queryFn: () => fetchMachines(lineId),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mesin</h1>
        {canManage && <MachineFormDialog lineId={lineId} trigger={<Button>Tambah Mesin</Button>} />}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : machines?.length === 0 ? (
        <p className="text-muted-foreground">Belum ada mesin di line ini.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {machines?.map((machine) => (
            <Card key={machine.id}>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">
                  <Link to={`/machines/${machine.id}`} className="hover:underline">
                    {machine.name}
                  </Link>
                </CardTitle>
                {!machine.is_active && <Badge variant="outline">Nonaktif</Badge>}
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="font-mono text-sm text-muted-foreground">{machine.code}</div>
                <div className="text-sm">
                  Jam operasi: <span className="font-medium">{machine.runtime_hours}</span>
                </div>
                {canManage && <AddRuntimeDialog machineId={machine.id} lineId={lineId} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
