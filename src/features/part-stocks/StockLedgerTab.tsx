import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Download, Pencil, Printer, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import {
  deleteStockLedgerReceiving,
  fetchPartStocksForBranch,
  fetchStockLedgerReport,
  type StockLedgerReportEntry,
} from '@/features/part-stocks/api'
import { EditStockInDialog } from '@/features/part-stocks/EditStockInDialog'
import { fetchLines } from '@/features/lines/api'
import { fetchParts } from '@/features/parts/api'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const ALL = 'all'

const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

function firstOfMonth(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function toCsvValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

/**
 * Branch-wide Transaksi Stok — every stock movement, any part, split into
 * Stock In (receiving) and Stock Out (everything else: pemakaian,
 * penyesuaian, retur, transfer) since those two read very differently (a
 * receipt vs. "where did it go"). Stock In rows the backend flags
 * `is_editable` (the single most recent receiving entry for that
 * part_stock — see StockLedgerController) get Edit/Delete; every other row
 * stays append-only. Export is a client-side CSV of whichever tab is
 * active; Cetak hands the filtered data off to a dedicated print route
 * that aggregates it per-part instead of printing this same
 * transaction-by-transaction list.
 */
export function StockLedgerTab({ branchId }: { branchId: number }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const [partFilter, setPartFilter] = useState<string>(ALL)
  const [lineFilter, setLineFilter] = useState<string>(ALL)
  const [activeTab, setActiveTab] = useState<'in' | 'out'>('in')
  const [editingEntry, setEditingEntry] = useState<StockLedgerReportEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<StockLedgerReportEntry | null>(null)

  const { data: parts } = useQuery({ queryKey: ['parts'], queryFn: fetchParts })
  const { data: lines } = useQuery({ queryKey: ['lines', branchId], queryFn: () => fetchLines(branchId) })
  const activeBranch = useAuthStore((state) => state.user?.branches.find((b) => b.id === branchId))

  const { data: entries, isLoading } = useQuery({
    queryKey: ['stock-ledger-report', branchId, from, to, partFilter, lineFilter],
    queryFn: () =>
      fetchStockLedgerReport(branchId, {
        from: from || undefined,
        to: to || undefined,
        part_id: partFilter !== ALL ? Number(partFilter) : undefined,
        line_id: lineFilter !== ALL ? Number(lineFilter) : undefined,
      }),
  })

  const { data: partStocks } = useQuery({
    queryKey: ['part-stocks', branchId],
    queryFn: () => fetchPartStocksForBranch(branchId),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteStockLedgerReceiving(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-ledger-report', branchId] })
      queryClient.invalidateQueries({ queryKey: ['part-stocks', branchId] })
      toast.success('Transaksi penerimaan dihapus.')
      setDeletingEntry(null)
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menghapus transaksi.'
      toast.error(message)
    },
  })

  const stockInEntries = entries?.filter((entry) => entry.type === 'receiving') ?? []
  const stockOutEntries = entries?.filter((entry) => entry.type !== 'receiving') ?? []
  const activeEntries = activeTab === 'in' ? stockInEntries : stockOutEntries

  function handleExportCsv() {
    if (activeEntries.length === 0) return

    const headers =
      activeTab === 'in'
        ? ['Tanggal', 'Part', 'Item Master', 'Qty', 'Harga Total', 'Catatan', 'Oleh']
        : ['Tanggal', 'Part', 'Item Master', 'Line', 'Equipment', 'Jalur', 'Perubahan', 'Saldo Akhir', 'Catatan', 'Oleh']

    const rows = activeEntries.map((entry) =>
      activeTab === 'in'
        ? [
            new Date(entry.occurred_at).toLocaleString('id-ID'),
            entry.part_name,
            entry.item_master_no,
            String(entry.quantity_change),
            entry.unit_cost != null ? String(Number(entry.unit_cost) * entry.quantity_change) : '',
            entry.notes ?? '',
            entry.user_name ?? '',
          ]
        : [
            new Date(entry.occurred_at).toLocaleString('id-ID'),
            entry.part_name,
            entry.item_master_no,
            entry.line_name ?? '',
            entry.equipment_name ?? '',
            entry.channel,
            String(entry.quantity_change),
            String(entry.balance_after),
            entry.notes ?? '',
            entry.user_name ?? '',
          ],
    )

    const csv = [headers, ...rows].map((row) => row.map((cell) => toCsvValue(cell)).join(',')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `transaksi-stok-${activeTab}_${from}_${to}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function handlePrint() {
    navigate('/stock/transaction/print', {
      state: {
        branchName: activeBranch ? `${activeBranch.code} — ${activeBranch.name}` : undefined,
        from,
        to,
        entries: entries ?? [],
        partStocks: partStocks ?? [],
      },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ledger-from">Dari Tanggal</Label>
          <Input id="ledger-from" type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ledger-to">Sampai Tanggal</Label>
          <Input id="ledger-to" type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Part</Label>
          <Select value={partFilter} onValueChange={(value) => setPartFilter(value ?? ALL)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua Part</SelectItem>
              {parts?.map((part) => (
                <SelectItem key={part.id} value={String(part.id)}>
                  {part.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Line</Label>
          <Select value={lineFilter} onValueChange={(value) => setLineFilter(value ?? ALL)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua Line</SelectItem>
              {lines?.map((line) => (
                <SelectItem key={line.id} value={String(line.id)}>
                  {line.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={activeEntries.length === 0}>
            <Download className="size-3.5" />
            Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!entries || entries.length === 0}>
            <Printer className="size-3.5" />
            Cetak
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'in' | 'out')}>
        <TabsList>
          <TabsTrigger value="in">Stock In ({stockInEntries.length})</TabsTrigger>
          <TabsTrigger value="out">Stock Out ({stockOutEntries.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="in" className="mt-4">
          {isLoading ? (
            <Skeleton className="h-60 w-full" />
          ) : stockInEntries.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Tidak ada penerimaan pada rentang ini" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Part</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Harga Total</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead>Oleh</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockInEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(entry.occurred_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{entry.part_name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{entry.item_master_no}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-success">
                      +{entry.quantity_change}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {entry.unit_cost != null
                        ? currencyFormatter.format(Number(entry.unit_cost) * entry.quantity_change)
                        : '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground" title={entry.notes ?? ''}>
                      {entry.notes ?? '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{entry.user_name ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      {entry.is_editable ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Edit transaksi"
                            aria-label="Edit transaksi"
                            onClick={() => setEditingEntry(entry)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Hapus transaksi"
                            aria-label="Hapus transaksi"
                            onClick={() => setDeletingEntry(entry)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="out" className="mt-4">
          {isLoading ? (
            <Skeleton className="h-60 w-full" />
          ) : stockOutEntries.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Tidak ada pemakaian pada rentang ini" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Part</TableHead>
                  <TableHead>Line / Equipment</TableHead>
                  <TableHead>Jalur</TableHead>
                  <TableHead className="text-right">Perubahan</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead>Oleh</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockOutEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(entry.occurred_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{entry.part_name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{entry.item_master_no}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.line_name ? (
                        <>
                          {entry.line_name}
                          {entry.equipment_name && <span className="block text-xs">{entry.equipment_name}</span>}
                        </>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{entry.channel}</Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-medium tabular-nums',
                        entry.quantity_change < 0 ? 'text-destructive' : 'text-success',
                      )}
                    >
                      {entry.quantity_change > 0 ? `+${entry.quantity_change}` : entry.quantity_change}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{entry.balance_after}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground" title={entry.notes ?? ''}>
                      {entry.notes ?? '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{entry.user_name ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      <EditStockInDialog branchId={branchId} entry={editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)} />

      <AlertDialog open={!!deletingEntry} onOpenChange={(open) => !open && setDeletingEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus transaksi penerimaan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Penerimaan "{deletingEntry?.part_name}" sebanyak {deletingEntry?.quantity_change} unit akan dihapus permanen,
              dan stok part ini akan dikembalikan seperti sebelum transaksi ini dicatat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingEntry && deleteMutation.mutate(deletingEntry.id)}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
