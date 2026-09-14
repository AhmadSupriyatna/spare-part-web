import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { AdjustStockDialog } from '@/features/part-stocks/AdjustStockDialog'
import { fetchPartStock, fetchPartStockLedger } from '@/features/part-stocks/api'
import { ReceiveStockDialog } from '@/features/part-stocks/ReceiveStockDialog'
import { fetchPart } from '@/features/parts/api'
import { useCanManage } from '@/stores/use-has-role'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

const ledgerTypeLabels: Record<string, string> = {
  receiving: 'Penerimaan',
  issue: 'Pemakaian',
  adjustment: 'Penyesuaian',
  return: 'Retur',
  transfer_in: 'Transfer Masuk',
  transfer_out: 'Transfer Keluar',
  correction: 'Koreksi',
}

export function PartStockDetailPage() {
  const { id } = useParams<{ id: string }>()
  const partStockId = Number(id)
  const canManage = useCanManage()

  const { data: stock, isLoading } = useQuery({
    queryKey: ['part-stock', partStockId],
    queryFn: () => fetchPartStock(partStockId),
  })

  const { data: part } = useQuery({
    queryKey: ['part', stock?.part_id],
    queryFn: () => fetchPart(stock!.part_id),
    enabled: !!stock,
  })

  const { data: ledger } = useQuery({
    queryKey: ['part-stock-ledger', partStockId],
    queryFn: () => fetchPartStockLedger(partStockId),
  })

  if (isLoading || !stock) {
    return <Skeleton className="h-64 w-full" />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{part?.name ?? `Part #${stock.part_id}`}</h1>
          <p className="font-mono text-sm text-muted-foreground">{part?.item_master_no}</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <AdjustStockDialog partStockId={stock.id} branchId={stock.branch_id} />
            <ReceiveStockDialog
              partStockId={stock.id}
              branchId={stock.branch_id}
              currentQuantity={stock.quantity_on_hand}
              currentUnitCost={stock.unit_cost}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Stok Saat Ini</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <span className="text-2xl font-semibold">{stock.quantity_on_hand}</span>
            {stock.is_critical && <Badge variant="destructive">Kritis</Badge>}
            {!stock.is_critical && stock.is_below_reorder_point && <Badge variant="warning">Rendah</Badge>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Harga Modal</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {currencyFormatter.format(Number(stock.unit_cost))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Batas Minimum</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stock.minimum_stock}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Titik Reorder</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stock.reorder_point}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Lokasi</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stock.location_code ?? '-'}</CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Riwayat Perubahan Stok</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead className="text-right">Perubahan</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Catatan</TableHead>
              <TableHead>Oleh</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledger?.data.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(entry.occurred_at).toLocaleString('id-ID')}
                </TableCell>
                <TableCell>{ledgerTypeLabels[entry.type] ?? entry.type}</TableCell>
                <TableCell
                  className={`text-right font-medium ${entry.quantity_change < 0 ? 'text-destructive' : 'text-green-600'}`}
                >
                  {entry.quantity_change > 0 ? '+' : ''}
                  {entry.quantity_change}
                </TableCell>
                <TableCell className="text-right">{entry.balance_after}</TableCell>
                <TableCell className="text-muted-foreground">{entry.notes ?? '-'}</TableCell>
                <TableCell className="text-muted-foreground">{entry.user?.name ?? 'Sistem'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
