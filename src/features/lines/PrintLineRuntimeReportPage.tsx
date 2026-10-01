import { useQuery } from '@tanstack/react-query'
import { Gauge } from 'lucide-react'
import { useLocation } from 'react-router'
import { fetchCompanySetting } from '@/features/settings/api'
import { LineRuntimeReportPrintSection } from '@/features/lines/LineRuntimeReportPrintSection'
import type { LineRuntimeLog } from '@/types/tasks'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'

interface PrintLineRuntimeReportLocationState {
  lineName: string
  lineCode: string
  branchName?: string | null
  currentHours: number
  periodLabel: string
  logs: LineRuntimeLog[]
}

/**
 * Reached from Line Equipment's "Cetak Report" button next to Catatan Jam
 * Operasional — the already-fetched log list is handed over via router
 * state (same pattern as PrintMaintenanceReportPage), never refetched
 * here. Reloading this page directly (no state) has nothing to print.
 */
export function PrintLineRuntimeReportPage() {
  const location = useLocation()
  const state = location.state as PrintLineRuntimeReportLocationState | null

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  if (!state) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Gauge}
          title="Tidak ada laporan untuk dicetak"
          description="Buka Line Equipment, pilih Line-nya, lalu tekan tombol Cetak Report di Catatan Jam Operasional."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6 print:p-0">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #line-runtime-report-print-area, #line-runtime-report-print-area * { visibility: visible; }
          #line-runtime-report-print-area { position: absolute; inset: 0; padding: 24px; }
        }
      `}</style>

      <div className="flex justify-end print:hidden">
        <Button onClick={() => window.print()}>Cetak</Button>
      </div>

      <div id="line-runtime-report-print-area">
        <LineRuntimeReportPrintSection
          lineName={state.lineName}
          lineCode={state.lineCode}
          branchName={state.branchName}
          currentHours={state.currentHours}
          periodLabel={state.periodLabel}
          logs={state.logs}
          companySetting={companySetting}
        />
      </div>
    </div>
  )
}
