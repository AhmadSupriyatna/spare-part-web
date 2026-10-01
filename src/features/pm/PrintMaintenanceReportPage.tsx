import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router'
import { fetchCompanySetting } from '@/features/settings/api'
import { MaintenanceReportPrintSection, type MaintenanceReportSection } from '@/features/pm/MaintenanceReportPrintSection'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { ClipboardList } from 'lucide-react'

interface PrintMaintenanceReportLocationState {
  title: string
  branchName?: string | null
  machineName?: string | null
  lineName?: string | null
  periodLabel: string
  runtimeHours: number | null
  supervisorName?: string | null
  scanUrl?: string | null
  sections: MaintenanceReportSection[]
}

/**
 * Reached from the Maintenance page's "Laporan" tab — the already-fetched-
 * and-reviewed report is handed over via router state (same pattern as
 * PrintWoChecklistsPage), never refetched here. Reloading this page
 * directly (no state, e.g. a bookmark) has nothing to print.
 */
export function PrintMaintenanceReportPage() {
  const location = useLocation()
  const state = location.state as PrintMaintenanceReportLocationState | null

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  if (!state) {
    return (
      <div className="p-6">
        <EmptyState
          icon={ClipboardList}
          title="Tidak ada laporan untuk dicetak"
          description="Buka tab Laporan di halaman Maintenance, lalu tekan tombol Cetak."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6 print:p-0">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #maintenance-report-print-area, #maintenance-report-print-area * { visibility: visible; }
          #maintenance-report-print-area { position: absolute; inset: 0; padding: 24px; }
        }
      `}</style>

      <div className="flex justify-end print:hidden">
        <Button onClick={() => window.print()}>Cetak</Button>
      </div>

      <div id="maintenance-report-print-area">
        <MaintenanceReportPrintSection
          title={state.title}
          branchName={state.branchName}
          machineName={state.machineName}
          lineName={state.lineName}
          periodLabel={state.periodLabel}
          runtimeHours={state.runtimeHours}
          supervisorName={state.supervisorName}
          scanUrl={state.scanUrl}
          sections={state.sections}
          companySetting={companySetting}
        />
      </div>
    </div>
  )
}
