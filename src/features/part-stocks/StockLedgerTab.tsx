import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Download, Printer } from 'lucide-react'
import { useState } from 'react'
import { fetchStockLedgerReport } from '@/features/part-stocks/api'
import { fetchLines } from '@/features/lines/api'
import { fetchParts } from '@/features/parts/api'
import { fetchCompanySetting } from '@/features/settings/api'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const ALL = 'all'

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
 * Branch-wide in/out ledger report — every stock movement, any part, with
 * where it's traceable to (line/equipment when the movement came from a WO
 * or breakdown) and which jalur produced it. Default range is the current
 * month; date range, part, and line all narrow independently ("Semua"
 * clears each). Export is a client-side CSV (opens fine in Excel) rather
 * than a real .xlsx — no backend dependency needed for that.
 */
export function StockLedgerTab({ branchId }: { branchId: number }) {
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const [partFilter, setPartFilter] = useState<string>(ALL)
  const [lineFilter, setLineFilter] = useState<string>(ALL)

  const { data: parts } = useQuery({ queryKey: ['parts'], queryFn: fetchParts })
  const { data: lines } = useQuery({ queryKey: ['lines', branchId], queryFn: () => fetchLines(branchId) })
  const { data: companySetting } = useQuery({ queryKey: ['settings', 'company'], queryFn: fetchCompanySetting })
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

  function handleExportCsv() {
    if (!entries || entries.length === 0) return

    const headers = ['Tanggal', 'Part', 'Item Master', 'Line', 'Equipment', 'Jalur', 'Perubahan', 'Saldo Akhir', 'Catatan', 'Oleh']
    const rows = entries.map((entry) => [
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
    ])

    const csv = [headers, ...rows].map((row) => row.map((cell) => toCsvValue(cell)).join(',')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ledger-stok_${from}_${to}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #ledger-print-report, #ledger-print-report * { visibility: visible; }
          #ledger-print-report { position: absolute; inset: 0; padding: 16px; }
        }
      `}</style>

      <div className="flex flex-wrap items-end gap-3 print:hidden">
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={!entries || entries.length === 0}
          >
            <Download className="size-3.5" />
            Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            Cetak
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-60 w-full" />
      ) : !entries || entries.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Tidak ada transaksi pada rentang ini" />
      ) : (
        <Table className="print:hidden">
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
            {entries.map((entry) => (
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

      {/* Print-only — a proper report layout (company header, date range, one wide table) instead of just printing the on-screen filters+table as-is. */}
      {entries && entries.length > 0 && (
        <div id="ledger-print-report" className="hidden flex-col gap-3 text-sm print:flex">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              {companySetting?.logo_url ? (
                <img src={companySetting.logo_url} alt="" className="h-10 w-auto object-contain" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded border border-dashed text-[9px] text-muted-foreground">
                  Logo
                </div>
              )}
              <div>
                <p className="font-semibold">{companySetting?.name ?? 'Nama Perusahaan'}</p>
                <p className="text-xs text-muted-foreground">
                  {activeBranch ? `${activeBranch.code} — ${activeBranch.name}` : ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold uppercase tracking-wide">Laporan Ledger Stok</p>
              <p className="text-xs text-muted-foreground">
                {new Date(from).toLocaleDateString('id-ID')} — {new Date(to).toLocaleDateString('id-ID')}
              </p>
            </div>
          </div>

          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b">
                <th className="py-1.5">Tanggal</th>
                <th className="py-1.5">Part</th>
                <th className="py-1.5">Line / Equipment</th>
                <th className="py-1.5">Jalur</th>
                <th className="py-1.5 text-right">Perubahan</th>
                <th className="py-1.5 text-right">Saldo</th>
                <th className="py-1.5">Catatan</th>
                <th className="py-1.5">Oleh</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b align-top">
                  <td className="py-1.5">{new Date(entry.occurred_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="py-1.5">
                    {entry.part_name}
                    <div className="font-mono text-[10px] text-muted-foreground">{entry.item_master_no}</div>
                  </td>
                  <td className="py-1.5">
                    {entry.line_name ?? '-'}
                    {entry.equipment_name && <div className="text-[10px] text-muted-foreground">{entry.equipment_name}</div>}
                  </td>
                  <td className="py-1.5">{entry.channel}</td>
                  <td className="py-1.5 text-right">{entry.quantity_change > 0 ? `+${entry.quantity_change}` : entry.quantity_change}</td>
                  <td className="py-1.5 text-right">{entry.balance_after}</td>
                  <td className="py-1.5">{entry.notes ?? '-'}</td>
                  <td className="py-1.5">{entry.user_name ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
