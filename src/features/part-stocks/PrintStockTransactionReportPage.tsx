import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { useLocation } from 'react-router'
import type { StockLedgerReportEntry } from '@/features/part-stocks/api'
import { StockTransactionReportPrintSection } from '@/features/part-stocks/StockTransactionReportPrintSection'
import { fetchCompanySetting } from '@/features/settings/api'
import type { PartStock } from '@/types/inventory'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'

interface PrintStockTransactionReportLocationState {
  branchName?: string
  from: string
  to: string
  entries: StockLedgerReportEntry[]
  partStocks: PartStock[]
}

/**
 * Reached from Transaksi Stok's "Cetak" button — the already-fetched
 * entries/partStocks are handed over via router state (same pattern as
 * PrintLineMonthlyReportPage), never refetched here.
 */
export function PrintStockTransactionReportPage() {
  const location = useLocation()
  const state = location.state as PrintStockTransactionReportLocationState | null

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
          description="Buka Transaksi Stok, atur filternya, lalu tekan tombol Cetak."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6 print:p-0">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #stock-transaction-report-print-area, #stock-transaction-report-print-area * { visibility: visible; }
          #stock-transaction-report-print-area { position: absolute; inset: 0; padding: 24px; }
        }
      `}</style>

      <div className="flex justify-end print:hidden">
        <Button onClick={() => window.print()}>Cetak</Button>
      </div>

      <div id="stock-transaction-report-print-area">
        <StockTransactionReportPrintSection
          entries={state.entries}
          partStocks={state.partStocks}
          branchName={state.branchName}
          from={state.from}
          to={state.to}
          companySetting={companySetting}
        />
      </div>
    </div>
  )
}
