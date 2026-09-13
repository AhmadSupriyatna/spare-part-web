import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { fetchPart } from '@/features/parts/api'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function PartDetailPage() {
  const { id } = useParams<{ id: string }>()
  const partId = Number(id)

  const { data: part, isLoading } = useQuery({
    queryKey: ['part', partId],
    queryFn: () => fetchPart(partId),
  })

  if (isLoading || !part) {
    return <Skeleton className="h-64 w-full" />
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{part.name}</h1>
        <p className="font-mono text-sm text-muted-foreground">{part.sku}</p>
        {part.description && <p className="mt-2 text-muted-foreground">{part.description}</p>}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Stok per Cabang</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cabang</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {part.stocks?.map((stock) => (
              <TableRow key={stock.id}>
                <TableCell>
                  <Link to={`/stock/${stock.id}`} className="font-medium hover:underline">
                    {stock.branch_name ?? `Cabang #${stock.branch_id}`}
                  </Link>
                </TableCell>
                <TableCell className="text-right font-medium">{stock.quantity_on_hand}</TableCell>
                <TableCell>
                  {stock.is_critical ? (
                    <Badge variant="destructive">Kritis</Badge>
                  ) : stock.is_below_reorder_point ? (
                    <Badge variant="secondary">Rendah</Badge>
                  ) : (
                    <Badge variant="outline">Normal</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
