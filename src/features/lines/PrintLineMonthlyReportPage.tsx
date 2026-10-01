import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { useLocation } from 'react-router'
import { fetchCompanySetting } from '@/features/settings/api'
import { LineMonthlyReportPrintSection } from '@/features/lines/LineMonthlyReportPrintSection'
import type { LineKwhReportRow, LineRuntimeReportRow } from '@/types/tasks'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'

type PrintLineMonthlyReportLocationState =
  | { metric: 'kwh'; branchName?: string | null; monthLabel: string; rows: LineKwhReportRow[] }
  | { metric: 'runtime'; branchName?: string | null; monthLabel: string; rows: LineRuntimeReportRow[] }

/**
 * Reached from Line Equipment's "Laporan" tab (Laporan kWh / Laporan
 * Running Hours Line) — the already-fetched rows are handed over via
 * router state (same pattern as PrintMaintenanceReportPage /
 * PrintLineRuntimeReportPage), never refetched here.
 */
export function PrintLineMonthlyReportPage() {
  const location = useLocation()
  const state = location.state as PrintLineMonthlyReportLocationState | null

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  if (!state) {
    return (
      <div className="p-6">
        <EmptyState
          icon={FileText}
          title="Tidak ada laporan untuk dicetak"
          description="Buka Line Equipment → Laporan, pilih bulannya, lalu tekan tombol Cetak."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6 print:p-0">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #line-monthly-report-print-area, #line-monthly-report-print-area * { visibility: visible; }
          #line-monthly-report-print-area { position: absolute; inset: 0; padding: 24px; }
        }
      `}</style>

      <div className="flex justify-end print:hidden">
        <Button onClick={() => window.print()}>Cetak</Button>
      </div>

      <div id="line-monthly-report-print-area">
        {state.metric === 'kwh' ? (
          <LineMonthlyReportPrintSection
            metric="kwh"
            rows={state.rows}
            branchName={state.branchName}
            monthLabel={state.monthLabel}
            companySetting={companySetting}
          />
        ) : (
          <LineMonthlyReportPrintSection
            metric="runtime"
            rows={state.rows}
            branchName={state.branchName}
            monthLabel={state.monthLabel}
            companySetting={companySetting}
          />
        )}
      </div>
    </div>
  )
}
