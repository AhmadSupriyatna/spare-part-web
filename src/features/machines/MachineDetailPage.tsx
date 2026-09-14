import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { EquipmentFormDialog } from '@/features/equipment/EquipmentFormDialog'
import { fetchEquipmentList } from '@/features/equipment/api'
import { fetchMachine } from '@/features/machines/api'
import { useCanManage } from '@/stores/use-has-role'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function MachineDetailPage() {
  const { id } = useParams<{ id: string }>()
  const machineId = Number(id)
  const canManage = useCanManage()

  const { data: machine } = useQuery({
    queryKey: ['machine', machineId],
    queryFn: () => fetchMachine(machineId),
  })

  const { data: equipmentList, isLoading } = useQuery({
    queryKey: ['equipment', machineId],
    queryFn: () => fetchEquipmentList(machineId),
  })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{machine?.name ?? 'Mesin'}</h1>
        {machine?.category && <p className="text-muted-foreground">{machine.category}</p>}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Equipment</h2>
        {canManage && (
          <EquipmentFormDialog machineId={machineId} trigger={<Button>Tambah Equipment</Button>} />
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : equipmentList?.length === 0 ? (
        <p className="text-muted-foreground">Belum ada equipment di mesin ini.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {equipmentList?.map((equipment) => (
            <Link key={equipment.id} to={`/equipment/${equipment.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">{equipment.name}</CardTitle>
                  {!equipment.is_active && <Badge variant="outline">Nonaktif</Badge>}
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  <span className="font-mono text-sm text-muted-foreground">{equipment.code}</span>
                  {equipment.category && (
                    <span className="text-sm text-muted-foreground">{equipment.category}</span>
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
