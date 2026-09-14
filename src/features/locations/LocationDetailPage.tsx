import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { fetchLocation } from '@/features/locations/api'
import { AssignPartToLocationDialog } from '@/features/part-stocks/AssignPartToLocationDialog'
import { fetchPartStocksForLocation, removePartStockLocation } from '@/features/part-stocks/api'
import { useCanManage } from '@/stores/use-has-role'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function LocationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const locationId = Number(id)
  const canManage = useCanManage()
  const queryClient = useQueryClient()

  const { data: location, isLoading } = useQuery({
    queryKey: ['location', locationId],
    queryFn: () => fetchLocation(locationId),
  })

  const { data: partStocks, isLoading: partStocksLoading } = useQuery({
    queryKey: ['part-stocks-for-location', locationId],
    queryFn: () => fetchPartStocksForLocation(locationId),
  })

  const releaseMutation = useMutation({
    mutationFn: removePartStockLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-stocks-for-location', locationId] })
      queryClient.invalidateQueries({ queryKey: ['part-stocks', location?.branch_id] })
      toast.success('Part berhasil dilepas dari lokasi ini.')
    },
  })

  if (isLoading || !location) {
    return <Skeleton className="h-64 w-full" />
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">{location.code}</h1>
        <p className="text-sm text-muted-foreground">
          Rak {location.rack} &middot; Bin {location.bin}
        </p>
        {location.description && <p className="mt-1 text-muted-foreground">{location.description}</p>}
        <div className="mt-2">
          {location.is_active ? (
            <Badge variant="outline">Aktif</Badge>
          ) : (
            <Badge variant="secondary">Nonaktif</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Part di Lokasi Ini</h2>
          {canManage && (
            <AssignPartToLocationDialog
              branchId={location.branch_id}
              locationId={locationId}
              trigger={<Button size="sm">Tambah Part</Button>}
            />
          )}
        </div>
        {partStocksLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : partStocks?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada part yang ditempatkan di lokasi ini.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {partStocks?.map((stock) => (
                <TableRow key={stock.id}>
                  <TableCell>
                    <Link to={`/stock/${stock.id}`} className="font-medium hover:underline">
                      {stock.part_name ?? `Part #${stock.part_id}`}
                    </Link>
                    <p className="font-mono text-xs text-muted-foreground">{stock.item_master_no}</p>
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
                  {canManage && (
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
                          Lepas
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Lepas part dari lokasi ini?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{stock.part_name ?? `Part #${stock.part_id}`}" tidak akan lagi tercatat di
                              lokasi manapun sampai ditempatkan ulang.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => releaseMutation.mutate(stock.id)}>
                              Lepas
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
