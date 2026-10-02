import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, FileDown, Printer } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { fetchMachineSummary } from '@/features/machines/api'
import { MachineDashboardContent, PassportHistoryCard, UpcomingTasksCard } from '@/features/machines/MachineDashboardContent'
import { MachineMiniCalendar } from '@/features/machines/MachineMiniCalendar'
import { MachineReportPrintSection } from '@/features/machines/MachineReportPrintSection'
import { MachineTaskHistoryTable } from '@/features/machines/MachineTaskHistoryTable'
import { fetchCompanySetting } from '@/features/settings/api'
import { PageHeader } from '@/components/PageHeader'
import { PanelCard } from '@/components/PanelCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

function toCsvValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

/**
 * Machine Detail — the authenticated, cost-aware twin of
 * MachineMonitoringPage (the public QR-scan landing page). Same
 * MachineDashboardContent, same data shape (MachineSummaryData extends
 * MachineMonitoringData), plus cost tiles/charts and this page's own
 * Export Excel/Print, the mini calendar and paginated PM history — none of
 * which exist on the public page, by request.
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

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  function handleExportCsv() {
    if (!data) return

    const rows: string[][] = [
      ['Mesin', data.machine.name],
      ['Kode', data.machine.code],
      ['Line / Plant', data.machine.line_id != null ? (data.machine.line_name ?? '-') : (data.machine.branch_name ?? '-')],
      ['Running Hours (Line)', data.line_runtime_hours != null ? String(data.line_runtime_hours) : '-'],
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
      ['Equipment', 'Part', 'Passport', 'Bekas Repair', 'Tanggal Pasang', 'Life Time', 'Rata-rata Historis (jam)'],
      ...data.installations.map((installation) => {
        const history = data.historical_part_lifetime.find((row) => row.part_id === installation.part_id)
        return [
          installation.equipment_name ?? '-',
          installation.part_name ?? '-',
          installation.has_passport ? 'Ya' : '-',
          installation.was_repaired ? 'Ya' : '-',
          new Date(installation.installed_at).toLocaleDateString('id-ID'),
          installation.percent_used != null
            ? `Sisa ${Math.max(0, 100 - Math.round(installation.percent_used))}%`
            : installation.age_in_runtime_hours != null
              ? `${installation.age_in_runtime_hours} jam`
              : '-',
          history ? String(history.average_runtime_hours) : '-',
        ]
      }),
      [],
      ['Riwayat Part Passport Terpasang'],
      ['Equipment', 'Part', 'Unit', 'Pasang', 'Lepas'],
      ...data.passport_install_history.map((row) => [
        row.equipment_name ?? '-',
        row.part_name ?? '-',
        row.unit_code ?? '-',
        new Date(row.installed_at).toLocaleDateString('id-ID'),
        row.is_active ? 'Masih terpasang' : row.removed_at ? new Date(row.removed_at).toLocaleDateString('id-ID') : '-',
      ]),
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
          showUpcomingTasks={false}
          showPassportHistory={false}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PanelCard>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Kalender PM &amp; Failure</CardTitle>
            </CardHeader>
            <CardContent>
              <MachineMiniCalendar machineId={machineId} />
            </CardContent>
          </PanelCard>

          <UpcomingTasksCard tasks={data.upcoming_tasks} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PanelCard>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Riwayat PM</CardTitle>
            </CardHeader>
            <CardContent>
              <MachineTaskHistoryTable machineId={machineId} />
            </CardContent>
          </PanelCard>

          {data.installations.some((installation) => installation.has_passport) && (
            <PassportHistoryCard history={data.passport_install_history} />
          )}
        </div>
      </div>

      <div id="machine-report-print-area" className="hidden">
        <MachineReportPrintSection data={data} companySetting={companySetting} />
      </div>
    </div>
  )
}
