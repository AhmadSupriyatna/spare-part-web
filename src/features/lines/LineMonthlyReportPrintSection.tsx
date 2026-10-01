import type { LineKwhReportRow, LineRuntimeReportRow } from '@/types/tasks'
import type { CompanySetting } from '@/types/settings'

interface BaseProps {
  branchName?: string | null
  monthLabel: string
  companySetting?: CompanySetting
}

type LineMonthlyReportPrintSectionProps =
  | (BaseProps & { metric: 'kwh'; rows: LineKwhReportRow[] })
  | (BaseProps & { metric: 'runtime'; rows: LineRuntimeReportRow[] })

function fmt(value: number | null): string {
  return value == null ? '-' : value.toLocaleString('id-ID')
}

/**
 * "Laporan kWh" / "Laporan Running Hours Line" — every Line in the branch,
 * one calendar month, printed as a single clean table (explicitly not a
 * card list like the per-Line reports — this one's meant to be scanned
 * top-to-bottom at a glance across every Line). Modern but restrained:
 * a colored header row and a bold total row are the only accents.
 */
export function LineMonthlyReportPrintSection(props: LineMonthlyReportPrintSectionProps) {
  const { branchName, monthLabel, companySetting, metric, rows } = props
  const title = metric === 'kwh' ? 'Laporan kWh Seluruh Line' : 'Laporan Running Hours Seluruh Line'

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
          <p className="text-lg font-bold tracking-wide uppercase">{title}</p>
          <p className="text-xs text-neutral-500">Periode {monthLabel}</p>
        </div>
      </div>

      {metric === 'kwh' ? (
        <KwhTable rows={rows} />
      ) : (
        <RuntimeTable rows={rows} />
      )}
    </div>
  )
}

function KwhTable({ rows }: { rows: LineKwhReportRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.total_kwh, 0)

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b-2 border-neutral-800 bg-neutral-50 text-left text-xs font-semibold tracking-wide text-neutral-600 uppercase">
          <th className="py-2 pl-2">Line</th>
          <th className="py-2">Kode</th>
          <th className="py-2 text-right">Jumlah Entri</th>
          <th className="py-2 pr-2 text-right">Total Pemakaian (kWh)</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={4} className="py-6 text-center text-neutral-500">
              Tidak ada Line pada plant ini.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.line_id} className="border-b border-neutral-200 break-inside-avoid">
              <td className="py-2 pl-2 font-medium">{row.line_name}</td>
              <td className="py-2 font-mono text-xs text-neutral-500">{row.line_code}</td>
              <td className="py-2 text-right tabular-nums text-neutral-500">{row.entry_count}</td>
              <td className="py-2 pr-2 text-right font-semibold tabular-nums">{fmt(row.total_kwh)}</td>
            </tr>
          ))
        )}
      </tbody>
      {rows.length > 0 && (
        <tfoot>
          <tr className="border-t-2 border-neutral-800 font-bold">
            <td className="py-2 pl-2" colSpan={3}>
              Total Seluruh Line
            </td>
            <td className="py-2 pr-2 text-right tabular-nums">{fmt(total)}</td>
          </tr>
        </tfoot>
      )}
    </table>
  )
}

function RuntimeTable({ rows }: { rows: LineRuntimeReportRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.hours_added, 0)

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b-2 border-neutral-800 bg-neutral-50 text-left text-xs font-semibold tracking-wide text-neutral-600 uppercase">
          <th className="py-2 pl-2">Line</th>
          <th className="py-2">Kode</th>
          <th className="py-2 text-right">Jam Awal Bulan</th>
          <th className="py-2 text-right">Jam Akhir Bulan</th>
          <th className="py-2 pr-2 text-right">Penambahan Bulan Ini</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={5} className="py-6 text-center text-neutral-500">
              Tidak ada Line pada plant ini.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.line_id} className="border-b border-neutral-200 break-inside-avoid">
              <td className="py-2 pl-2 font-medium">{row.line_name}</td>
              <td className="py-2 font-mono text-xs text-neutral-500">{row.line_code}</td>
              <td className="py-2 text-right tabular-nums text-neutral-500">{fmt(row.hours_at_start)}</td>
              <td className="py-2 text-right tabular-nums text-neutral-500">{fmt(row.hours_at_end)}</td>
              <td className="py-2 pr-2 text-right font-semibold tabular-nums">+{fmt(row.hours_added)}</td>
            </tr>
          ))
        )}
      </tbody>
      {rows.length > 0 && (
        <tfoot>
          <tr className="border-t-2 border-neutral-800 font-bold">
            <td className="py-2 pl-2" colSpan={4}>
              Total Seluruh Line
            </td>
            <td className="py-2 pr-2 text-right tabular-nums">+{fmt(total)}</td>
          </tr>
        </tfoot>
      )}
    </table>
  )
}
