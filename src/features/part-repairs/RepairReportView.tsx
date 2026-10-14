import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { fetchPartRepairs } from '@/features/part-repairs/api'
import type { PartRepair, PartRepairDisposition } from '@/types/relations'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type FilterMode = 'month' | 'range'

const dispositionLabels: Record<PartRepairDisposition, string> = {
  pending: 'Perlu Keputusan',
  in_repair: 'Proses Repair',
  repaired: 'Siap Dipasang',
  scrapped: 'Dibuang',
}

function dateKey(value: string): string {
  return value.slice(0, 10)
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'
}

function monthName(value: string): string {
  const [year, month] = value.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function RepairReportView({ branchId }: { branchId: number }) {
  const navigate = useNavigate()
  const [filterMode, setFilterMode] = useState<FilterMode>('month')
  const [month, setMonth] = useState(currentMonthKey)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data: repairs, isLoading } = useQuery({
    queryKey: ['part-repairs', branchId],
    queryFn: () => fetchPartRepairs(branchId),
  })

  const filteredRepairs = useMemo(() => {
    const rows = repairs ?? []
    if (filterMode === 'month') {
      return month ? rows.filter((repair) => dateKey(repair.removed_at).startsWith(month)) : []
    }
    return rows.filter((repair) => {
      const removedDate = dateKey(repair.removed_at)
      return (!from || removedDate >= from) && (!to || removedDate <= to)
    })
  }, [filterMode, from, month, repairs, to])

  const rangeIsInvalid = filterMode === 'range' && Boolean(from && to && from > to)
  const monthIsMissing = filterMode === 'month' && !month
  const periodLabel =
    filterMode === 'month'
      ? monthName(month)
      : `${from ? new Date(`${from}T00:00:00`).toLocaleDateString('id-ID') : 'Awal'} – ${
          to ? new Date(`${to}T00:00:00`).toLocaleDateString('id-ID') : 'Sekarang'
        }`

  function printReport() {
    navigate('/pm/repairs/print', {
      state: { repairs: filteredRepairs, periodLabel: `Periode: ${periodLabel}` },
    })
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="repair-report-mode">Periode</Label>
            <select
              id="repair-report-mode"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={filterMode}
              onChange={(event) => setFilterMode(event.target.value as FilterMode)}
            >
              <option value="month">Per Bulan</option>
              <option value="range">Rentang Tanggal</option>
            </select>
          </div>
          {filterMode === 'month' ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="repair-report-month">Bulan</Label>
              <Input
                id="repair-report-month"
                type="month"
                className="w-44"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="repair-report-from">Dari Tanggal</Label>
                <Input
                  id="repair-report-from"
                  type="date"
                  className="w-44"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="repair-report-to">Sampai Tanggal</Label>
                <Input
                  id="repair-report-to"
                  type="date"
                  className="w-44"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                />
              </div>
            </>
          )}
        </div>
        <Button onClick={printReport} disabled={filteredRepairs.length === 0 || rangeIsInvalid || monthIsMissing}>
          <Printer />
          Cetak ({filteredRepairs.length})
        </Button>
      </div>

      {rangeIsInvalid && <p className="text-sm text-destructive">Tanggal awal harus sebelum tanggal akhir.</p>}
      {monthIsMissing && <p className="text-sm text-destructive">Pilih bulan terlebih dahulu.</p>}
      {filteredRepairs.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Tidak ada perbaikan pada periode ini"
          description="Ubah bulan atau rentang tanggal untuk melihat riwayat perbaikan."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead>Dilepas Dari</TableHead>
                <TableHead>Tanggal Dilepas</TableHead>
                <TableHead>Tanggal Diperbaiki</TableHead>
                <TableHead>Biaya Perbaikan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Oleh</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRepairs.map((repair) => (
                <RepairReportRow key={repair.id} repair={repair} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function RepairReportRow({ repair }: { repair: PartRepair }) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        {repair.part_name ?? '-'}
        <div className="font-mono text-xs text-muted-foreground">{repair.item_master_no}</div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {repair.equipment_name ?? '-'}
        <div className="text-xs">{[repair.machine_name, repair.line_name].filter(Boolean).join(' · ') || '-'}</div>
      </TableCell>
      <TableCell className="text-muted-foreground">{formatDate(repair.removed_at)}</TableCell>
      <TableCell className="text-muted-foreground">{formatDate(repair.repaired_at)}</TableCell>
      <TableCell className="text-muted-foreground">{repair.repair_cost ?? '-'}</TableCell>
      <TableCell>{dispositionLabels[repair.disposition]}</TableCell>
      <TableCell className="text-muted-foreground">{repair.removed_by_name ?? '-'}</TableCell>
    </TableRow>
  )
}
