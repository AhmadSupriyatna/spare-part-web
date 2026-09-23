import { useQuery } from '@tanstack/react-query'
import { Boxes, MapPin, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { AdjustStockDialog } from '@/features/part-stocks/AdjustStockDialog'
import { fetchPartStocksForBranch } from '@/features/part-stocks/api'
import { SetPartLocationDialog } from '@/features/part-stocks/SetPartLocationDialog'
import { StockLedgerTab } from '@/features/part-stocks/StockLedgerTab'
import { fetchParts } from '@/features/parts/api'
import { useBranchStore } from '@/stores/branch-store'
import { useCanManage } from '@/stores/use-has-role'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function PartStocksTable({ activeBranchId }: { activeBranchId: number }) {
  const [search, setSearch] = useState('')
  const canManage = useCanManage()

  const { data: stocks, isLoading } = useQuery({
    queryKey: ['part-stocks', activeBranchId],
    queryFn: () => fetchPartStocksForBranch(activeBranchId),
  })

  const { data: parts } = useQuery({
    queryKey: ['parts'],
    queryFn: fetchParts,
  })

  const partNameById = new Map(parts?.map((part) => [part.id, part]))

  const filteredStocks = stocks?.filter((stock) => {
    const part = partNameById.get(stock.part_id)
    const query = search.toLowerCase()
    return (
      part?.name.toLowerCase().includes(query) ||
      part?.item_master_no.toLowerCase().includes(query) ||
      stock.location_code?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Cari nama part, Item Master, atau lokasi..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : filteredStocks?.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={search ? 'Tidak ada stok yang cocok' : 'Belum ada stok di plant ini'}
          description={
            search
              ? 'Coba kata kunci lain, atau hapus pencarian untuk melihat semua stok.'
              : 'Stok akan muncul di sini setelah part diterima untuk plant ini.'
          }
        />
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
            {filteredStocks?.map((stock) => {
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
                  <TableCell className="text-right font-medium tabular-nums">{stock.quantity_on_hand}</TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{stock.reorder_point}</TableCell>
                  <TableCell>
                    {stock.is_critical ? (
                      <Badge variant="destructive">Kritis</Badge>
                    ) : stock.is_below_reorder_point ? (
                      <Badge variant="warning">Rendah</Badge>
                    ) : (
                      <Badge variant="success">Normal</Badge>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="flex justify-end gap-1">
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

export function PartStocksPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Kelola Stok" description="Posisi stok, dan riwayat keluar-masuk part di plant yang sedang aktif." />

      <Tabs defaultValue="stok">
        <TabsList>
          <TabsTrigger value="stok">Daftar Stok</TabsTrigger>
          <TabsTrigger value="ledger">Ledger Keluar-Masuk</TabsTrigger>
        </TabsList>
        <TabsContent value="stok" className="mt-4">
          <PartStocksTable activeBranchId={activeBranchId} />
        </TabsContent>
        <TabsContent value="ledger" className="mt-4">
          <StockLedgerTab branchId={activeBranchId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
