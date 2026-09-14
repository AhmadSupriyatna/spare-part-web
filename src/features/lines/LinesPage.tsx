import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { AddRuntimeDialog } from '@/features/lines/AddRuntimeDialog'
import { fetchLines } from '@/features/lines/api'
import { LineFormDialog } from '@/features/lines/LineFormDialog'
import { useBranchStore } from '@/stores/branch-store'
import { useCanManage } from '@/stores/use-has-role'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function LinesPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canManage = useCanManage()

  const { data: lines, isLoading } = useQuery({
    queryKey: ['lines', activeBranchId],
    queryFn: () => fetchLines(activeBranchId!),
    enabled: !!activeBranchId,
  })

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih cabang terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Line Produksi</h1>
        {canManage && <LineFormDialog branchId={activeBranchId} trigger={<Button>Tambah Line</Button>} />}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : lines?.length === 0 ? (
        <p className="text-muted-foreground">Belum ada line di cabang ini.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lines?.map((line) => (
            <Card key={line.id}>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">
                  <Link to={`/lines/${line.id}`} className="hover:underline">
                    {line.name}
                  </Link>
                </CardTitle>
                {!line.is_active && <Badge variant="outline">Nonaktif</Badge>}
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <span className="font-mono text-sm text-muted-foreground">{line.code}</span>
                <span className="text-sm">
                  Jam operasi: <span className="font-medium">{line.runtime_hours}</span>
                </span>
                {canManage && <AddRuntimeDialog lineId={line.id} branchId={activeBranchId} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
