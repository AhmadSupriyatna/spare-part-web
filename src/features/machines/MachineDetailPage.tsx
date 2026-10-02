import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, FileDown, Printer } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { fetchMachineSummary } from '@/features/machines/api'
import { MachineDashboardContent } from '@/features/machines/MachineDashboardContent'
import { MachineTaskHistoryTable } from '@/features/machines/MachineTaskHistoryTable'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PanelCard } from '@/components/PanelCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

function toCsvValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

/**
 * Machine Detail — the authenticated, cost-aware twin of
 * MachineMonitoringPage (the public QR-scan landing page). Same
 * MachineDashboardContent, same data shape (MachineSummaryData extends
 * MachineMonitoringData), plus the one cost tile and this page's own
 * Export Excel/Print — neither exists on the public page, by request
 * (cost and export both stay behind login).
 */
export function MachineDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const machineId = Number(id)

  const { data, isLoading } = useQuery({
    queryKey: ['machine-summary', machineId],
    queryFn: () => fetchMachineSummary(machineId),
    enabled: Number.isFinite(machineId),
  })

  function handleExportCsv() {
    if (!data) return

    const rows: string[][] = [
      ['Mesin', data.machine.name],
      ['Kode', data.machine.code],
      ['Line / Plant', data.machine.line_id != null ? (data.machine.line_name ?? '-') : (data.machine.branch_name ?? '-')],
      ['Equipment', String(data.equipment_count)],
      ['PM Terjadwal', String(data.upcoming_tasks.length)],
      ['PM Terlambat', String(data.overdue_task_count)],
      ['Rata-rata Umur Pakai (jam)', data.average_lifetime_hours != null ? String(data.average_lifetime_hours) : '-'],
      ['Nilai Part Terpasang', currencyFormatter.format(Number(data.installed_part_value))],
      [],
      ['Top Part Terpakai (12 Bulan Terakhir)'],
      ['Part', 'Item Master', 'Qty', 'Nilai'],
      ...data.top_parts_consumed.map((row) => [
        row.part_name,
        row.item_master_no,
        String(row.quantity),
        currencyFormatter.format(Number(row.cost ?? 0)),
      ]),
      [],
      ['Konsumsi Biaya per Equipment (Tahun Ini)'],
      ['Equipment', 'Nilai'],
      ...data.cost_by_equipment_this_year.map((row) => [row.equipment_name, currencyFormatter.format(Number(row.cost))]),
      [],
      ['Part per Equipment'],
      ['Equipment', 'Part', 'Sisa Umur Pakai', 'Tanggal Pasang', 'Rata-rata Umur Historis (jam)'],
      ...data.installations.map((installation) => {
        const history = data.historical_part_lifetime.find((row) => row.part_id === installation.part_id)
        return [
          installation.equipment_name ?? '-',
          installation.part_name ?? '-',
          installation.percent_used != null ? `${Math.round(100 - installation.percent_used)}%` : '-',
          new Date(installation.installed_at).toLocaleDateString('id-ID'),
          history ? String(history.average_runtime_hours) : '-',
        ]
      }),
    ]

    const csv = rows.map((row) => row.map((cell) => toCsvValue(cell)).join(',')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `laporan-mesin_${data.machine.code}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading || !data) {
    return <Skeleton className="h-64 w-full" />
  }

  return (
    <div className="flex flex-col gap-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #machine-report-print-area, #machine-report-print-area * { visibility: visible; }
          #machine-report-print-area { position: absolute; inset: 0; padding: 16px; display: block; }
        }
      `}</style>

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        <ArrowLeft className="size-4" />
        Kembali
      </button>

      <PageHeader
        className="print:hidden"
        title={data.machine.name}
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono">{data.machine.code}</span>
            {data.machine.category && <Badge variant="outline">{data.machine.category}</Badge>}
            {!data.machine.is_active && <Badge variant="secondary">Nonaktif</Badge>}
            <span>
              {data.machine.line_id != null
                ? `· Line ${data.machine.line_name ?? '-'}`
                : `· Luar Line — ${data.machine.branch_name ?? '-'}`}
            </span>
          </span>
        }
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <FileDown />
              Export Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer />
              Cetak
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-4 print:hidden">
        <MachineDashboardContent
          data={data}
          installedPartValue={data.installed_part_value}
          costByEquipmentThisYear={data.cost_by_equipment_this_year}
        />

        <PanelCard>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Riwayat PM</CardTitle>
          </CardHeader>
          <CardContent>
            <MachineTaskHistoryTable machineId={machineId} />
          </CardContent>
        </PanelCard>
      </div>

      <div id="machine-report-print-area" className="hidden">
        <h1 className="text-lg font-bold">Laporan Mesin — {data.machine.name}</h1>
        <p className="font-mono text-sm">{data.machine.code}</p>
        <p className="mb-4 text-sm">
          {data.machine.line_id != null ? `Line ${data.machine.line_name ?? '-'}` : `Luar Line — ${data.machine.branch_name ?? '-'}`}
        </p>

        <table className="mb-4 text-sm">
          <tbody>
            <tr>
              <td className="pr-4 font-medium">Equipment</td>
              <td>{data.equipment_count}</td>
            </tr>
            <tr>
              <td className="pr-4 font-medium">PM Terjadwal</td>
              <td>{data.upcoming_tasks.length}</td>
            </tr>
            <tr>
              <td className="pr-4 font-medium">PM Terlambat</td>
              <td>{data.overdue_task_count}</td>
            </tr>
            <tr>
              <td className="pr-4 font-medium">Rata-rata Umur Pakai</td>
              <td>{data.average_lifetime_hours != null ? `${data.average_lifetime_hours} jam` : '-'}</td>
            </tr>
            <tr>
              <td className="pr-4 font-medium">Nilai Part Terpasang</td>
              <td>{currencyFormatter.format(Number(data.installed_part_value))}</td>
            </tr>
          </tbody>
        </table>

        <h2 className="mb-2 font-semibold">Top Part Terpakai (12 Bulan Terakhir)</h2>
        <Table className="mb-4">
          <TableHeader>
            <TableRow>
              <TableHead>Part</TableHead>
              <TableHead>Item Master</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Nilai</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.top_parts_consumed.map((row) => (
              <TableRow key={row.part_id}>
                <TableCell>{row.part_name}</TableCell>
                <TableCell className="font-mono">{row.item_master_no}</TableCell>
                <TableCell className="text-right">{row.quantity}</TableCell>
                <TableCell className="text-right">{currencyFormatter.format(Number(row.cost ?? 0))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <h2 className="mb-2 font-semibold">Konsumsi Biaya per Equipment (Tahun Ini)</h2>
        <Table className="mb-4">
          <TableHeader>
            <TableRow>
              <TableHead>Equipment</TableHead>
              <TableHead className="text-right">Nilai</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.cost_by_equipment_this_year.map((row) => (
              <TableRow key={row.equipment_id}>
                <TableCell>{row.equipment_name}</TableCell>
                <TableCell className="text-right">{currencyFormatter.format(Number(row.cost))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <h2 className="mb-2 font-semibold">Part per Equipment</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipment</TableHead>
              <TableHead>Part</TableHead>
              <TableHead>Tanggal Pasang</TableHead>
              <TableHead className="text-right">Sisa Umur Pakai</TableHead>
              <TableHead className="text-right">Rata-rata Historis (jam)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.installations.map((installation) => {
              const history = data.historical_part_lifetime.find((row) => row.part_id === installation.part_id)
              return (
                <TableRow key={installation.id}>
                  <TableCell>{installation.equipment_name ?? '-'}</TableCell>
                  <TableCell>{installation.part_name ?? '-'}</TableCell>
                  <TableCell>{new Date(installation.installed_at).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell className="text-right">
                    {installation.percent_used != null ? `${Math.round(100 - installation.percent_used)}%` : '-'}
                  </TableCell>
                  <TableCell className="text-right">{history ? history.average_runtime_hours : '-'}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
