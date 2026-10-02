import type { StockLedgerReportEntry } from '@/features/part-stocks/api'
import type { PartStock } from '@/types/inventory'
import type { CompanySetting } from '@/types/settings'

interface PartSummaryRow {
  part_id: number
  part_name: string
  item_master_no: string
  qty_in: number
  qty_out: number
  destinations: { channel: string; qty: number }[]
  current_stock: number | null
}

function buildSummary(entries: StockLedgerReportEntry[], partStocks: PartStock[]): PartSummaryRow[] {
  const stockByPartId = new Map(partStocks.map((stock) => [stock.part_id, stock.quantity_on_hand]))
  const rows = new Map<number, PartSummaryRow>()

  for (const entry of entries) {
    if (!rows.has(entry.part_id)) {
      rows.set(entry.part_id, {
        part_id: entry.part_id,
        part_name: entry.part_name,
        item_master_no: entry.item_master_no,
        qty_in: 0,
        qty_out: 0,
        destinations: [],
        current_stock: stockByPartId.get(entry.part_id) ?? null,
      })
    }
    const row = rows.get(entry.part_id)!

    if (entry.quantity_change > 0) {
      row.qty_in += entry.quantity_change
    } else if (entry.quantity_change < 0) {
      const qty = Math.abs(entry.quantity_change)
      row.qty_out += qty
      const destination = row.destinations.find((d) => d.channel === entry.channel)
      if (destination) {
        destination.qty += qty
      } else {
        row.destinations.push({ channel: entry.channel, qty })
      }
    }
  }

  return Array.from(rows.values()).sort((a, b) => a.part_name.localeCompare(b.part_name))
}

interface StockTransactionReportPrintSectionProps {
  entries: StockLedgerReportEntry[]
  partStocks: PartStock[]
  branchName?: string
  from: string
  to: string
  companySetting?: CompanySetting
}

/**
 * "Transaksi Stok" print report — unlike the on-screen Stock In/Out tabs
 * (transaction-by-transaction), this is a per-PART summary: total masuk,
 * total keluar broken down by where it went (channel), and the current
 * stock balance. Same header/table language as LineMonthlyReportPrintSection
 * so every print report in this app reads as one family.
 */
export function StockTransactionReportPrintSection({
  entries,
  partStocks,
  branchName,
  from,
  to,
  companySetting,
}: StockTransactionReportPrintSectionProps) {
  const rows = buildSummary(entries, partStocks)
  const totalIn = rows.reduce((sum, row) => sum + row.qty_in, 0)
  const totalOut = rows.reduce((sum, row) => sum + row.qty_out, 0)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 text-sm text-neutral-900">
      <div className="flex items-center justify-between gap-4 border-b-2 border-amber-400 pb-3">
        <div className="flex items-center gap-2.5">
          {companySetting?.logo_url ? (
            <img src={companySetting.logo_url} alt="" className="h-10 w-auto object-contain" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded border border-dashed text-[9px] text-neutral-400">
              Logo
            </div>
          )}
          <div>
            <p className="font-semibold">{companySetting?.name ?? 'Nama Perusahaan'}</p>
            <p className="text-xs text-neutral-500">{branchName ?? '-'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tracking-wide uppercase">Laporan Transaksi Stok</p>
          <p className="text-xs text-neutral-500">
            {new Date(from).toLocaleDateString('id-ID')} — {new Date(to).toLocaleDateString('id-ID')}
          </p>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-neutral-800 bg-neutral-50 text-left text-xs font-semibold tracking-wide text-neutral-600 uppercase">
            <th className="py-2 pl-2">Part</th>
            <th className="py-2 text-right">Masuk</th>
            <th className="py-2">Keluar</th>
            <th className="py-2 pr-2 text-right">Stok Saat Ini</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-6 text-center text-neutral-500">
                Tidak ada transaksi pada rentang ini.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.part_id} className="border-b border-neutral-200 break-inside-avoid align-top">
                <td className="py-2 pl-2">
                  <p className="font-medium">{row.part_name}</p>
                  <p className="font-mono text-xs text-neutral-500">{row.item_master_no}</p>
                </td>
                <td className="py-2 text-right font-semibold tabular-nums">{row.qty_in > 0 ? `+${row.qty_in}` : '-'}</td>
                <td className="py-2">
                  {row.qty_out > 0 ? (
                    <>
                      <span className="font-semibold tabular-nums">-{row.qty_out}</span>
                      <p className="text-xs text-neutral-500">
                        {row.destinations.map((d) => `${d.channel}: ${d.qty}`).join(', ')}
                      </p>
                    </>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="py-2 pr-2 text-right font-semibold tabular-nums">{row.current_stock ?? '-'}</td>
              </tr>
            ))
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-neutral-800 font-bold">
              <td className="py-2 pl-2">Total</td>
              <td className="py-2 text-right tabular-nums">+{totalIn}</td>
              <td className="py-2">-{totalOut}</td>
              <td className="py-2 pr-2" />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
