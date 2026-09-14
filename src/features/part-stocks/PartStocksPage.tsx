import { useQuery } from '@tanstack/react-query'
import { MapPin, PackagePlus, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router'
import { AdjustStockDialog } from '@/features/part-stocks/AdjustStockDialog'
import { fetchPartStocksForBranch } from '@/features/part-stocks/api'
import { ReceiveStockDialog } from '@/features/part-stocks/ReceiveStockDialog'
import { SetPartLocationDialog } from '@/features/part-stocks/SetPartLocationDialog'
import { fetchParts } from '@/features/parts/api'
import { useBranchStore } from '@/stores/branch-store'
import { useCanManage } from '@/stores/use-has-role'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function PartStocksPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canManage = useCanManage()

  const { data: stocks, isLoading } = useQuery({
    queryKey: ['part-stocks', activeBranchId],
    queryFn: () => fetchPartStocksForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const { data: parts } = useQuery({
    queryKey: ['parts'],
    queryFn: fetchParts,
  })

  const partNameById = new Map(parts?.map((part) => [part.id, part]))

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih cabang terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Stok Part</h1>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead className="text-right">Titik Reorder</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {stocks?.map((stock) => {
              const part = partNameById.get(stock.part_id)
              return (
                <TableRow key={stock.id}>
                  <TableCell>
                    <Link to={`/stock/${stock.id}`} className="font-medium hover:underline">
                      {part?.name ?? `Part #${stock.part_id}`}
                    </Link>
                    <div className="font-mono text-xs text-muted-foreground">{part?.item_master_no}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{stock.location_code ?? '-'}</TableCell>
                  <TableCell className="text-right font-medium">{stock.quantity_on_hand}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{stock.reorder_point}</TableCell>
                  <TableCell>
                    {stock.is_critical ? (
                      <Badge variant="destructive">Kritis</Badge>
                    ) : stock.is_below_reorder_point ? (
                      <Badge variant="warning">Rendah</Badge>
                    ) : (
                      <Badge variant="outline">Normal</Badge>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="flex justify-end gap-1">
                      <ReceiveStockDialog
                        partStockId={stock.id}
                        branchId={stock.branch_id}
                        currentQuantity={stock.quantity_on_hand}
                        currentUnitCost={stock.unit_cost}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Terima barang"
                            title="Terima barang"
                          >
                            <PackagePlus />
                          </Button>
                        }
                      />
                      <AdjustStockDialog
                        partStockId={stock.id}
                        branchId={stock.branch_id}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Sesuaikan stok"
                            title="Sesuaikan stok"
                          >
                            <SlidersHorizontal />
                          </Button>
                        }
                      />
                      <SetPartLocationDialog
                        partId={stock.part_id}
                        partStockId={stock.id}
                        branchId={stock.branch_id}
                        currentLocationId={stock.location_id}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Atur lokasi"
                            title="Atur lokasi"
                          >
                            <MapPin />
                          </Button>
                        }
                      />
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
