import type { MachineSummaryData } from '@/features/machines/api'
import type { CompanySetting } from '@/types/settings'

const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

function fmtDate(value: string): string {
  return new Date(value).toLocaleDateString('id-ID')
}

interface MachineReportPrintSectionProps {
  data: MachineSummaryData
  companySetting?: CompanySetting
}

/**
 * Machine Detail's printed report — same header/table language as
 * LineMonthlyReportPrintSection (logo + company block on the left, title +
 * period on the right under one amber rule, a plain bold-bordered table per
 * section) so every print report in this app reads as one family instead
 * of each page inventing its own layout.
 */
export function MachineReportPrintSection({ data, companySetting }: MachineReportPrintSectionProps) {
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
            <p className="text-xs text-neutral-500">
              {data.machine.line_id != null
                ? `Line ${data.machine.line_name ?? '-'}`
                : `Luar Line — ${data.machine.branch_name ?? '-'}`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tracking-wide uppercase">Laporan Mesin</p>
          <p className="text-xs text-neutral-500">
            {data.machine.name} ({data.machine.code})
          </p>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <tbody>
          <tr className="border-b border-neutral-200">
            <td className="py-1.5 pr-2 font-medium text-neutral-600">Running Hours (Line)</td>
            <td className="py-1.5 text-right tabular-nums">{data.line_runtime_hours != null ? `${data.line_runtime_hours} jam` : '-'}</td>
            <td className="py-1.5 pr-2 pl-6 font-medium text-neutral-600">Equipment</td>
            <td className="py-1.5 text-right tabular-nums">{data.equipment_count}</td>
          </tr>
          <tr className="border-b border-neutral-200">
            <td className="py-1.5 pr-2 font-medium text-neutral-600">PM Terjadwal</td>
            <td className="py-1.5 text-right tabular-nums">{data.upcoming_tasks.length}</td>
            <td className="py-1.5 pr-2 pl-6 font-medium text-neutral-600">PM Terlambat</td>
            <td className="py-1.5 text-right tabular-nums">{data.overdue_task_count}</td>
          </tr>
          <tr className="border-b border-neutral-200">
            <td className="py-1.5 pr-2 font-medium text-neutral-600">Rata-rata Umur Pakai</td>
            <td className="py-1.5 text-right tabular-nums">
              {data.average_lifetime_hours != null ? `${data.average_lifetime_hours} jam` : '-'}
            </td>
            <td className="py-1.5 pr-2 pl-6 font-medium text-neutral-600">Nilai Part Terpasang</td>
            <td className="py-1.5 text-right font-semibold tabular-nums">
              {currencyFormatter.format(Number(data.installed_part_value))}
            </td>
          </tr>
        </tbody>
      </table>

      <div>
        <h2 className="mb-1.5 text-xs font-semibold tracking-wide text-neutral-600 uppercase">
          Top Part Terpakai (12 Bulan Terakhir)
        </h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-neutral-800 bg-neutral-50 text-left text-xs font-semibold tracking-wide text-neutral-600 uppercase">
              <th className="py-2 pl-2">Part</th>
              <th className="py-2">Item Master</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 pr-2 text-right">Nilai</th>
            </tr>
          </thead>
          <tbody>
            {data.top_parts_consumed.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-neutral-500">
                  Belum ada pemakaian part tercatat.
                </td>
              </tr>
            ) : (
              data.top_parts_consumed.map((row) => (
                <tr key={row.part_id} className="border-b border-neutral-200 break-inside-avoid">
                  <td className="py-1.5 pl-2 font-medium">{row.part_name}</td>
                  <td className="py-1.5 font-mono text-xs text-neutral-500">{row.item_master_no}</td>
                  <td className="py-1.5 text-right tabular-nums">{row.quantity}</td>
                  <td className="py-1.5 pr-2 text-right font-semibold tabular-nums">
                    {currencyFormatter.format(Number(row.cost ?? 0))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-1.5 text-xs font-semibold tracking-wide text-neutral-600 uppercase">
          Konsumsi Biaya per Equipment (Tahun Ini)
        </h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-neutral-800 bg-neutral-50 text-left text-xs font-semibold tracking-wide text-neutral-600 uppercase">
              <th className="py-2 pl-2">Equipment</th>
              <th className="py-2 pr-2 text-right">Nilai</th>
            </tr>
          </thead>
          <tbody>
            {data.cost_by_equipment_this_year.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-4 text-center text-neutral-500">
                  Belum ada konsumsi part tercatat tahun ini.
                </td>
              </tr>
            ) : (
              data.cost_by_equipment_this_year.map((row) => (
                <tr key={row.equipment_id} className="border-b border-neutral-200 break-inside-avoid">
                  <td className="py-1.5 pl-2 font-medium">{row.equipment_name}</td>
                  <td className="py-1.5 pr-2 text-right font-semibold tabular-nums">{currencyFormatter.format(Number(row.cost))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-1.5 text-xs font-semibold tracking-wide text-neutral-600 uppercase">Part per Equipment</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-neutral-800 bg-neutral-50 text-left text-xs font-semibold tracking-wide text-neutral-600 uppercase">
              <th className="py-2 pl-2">Equipment</th>
              <th className="py-2">Part</th>
              <th className="py-2">Tgl Pasang</th>
              <th className="py-2 text-right">Life Time</th>
              <th className="py-2 pr-2 text-right">Riwayat (jam)</th>
            </tr>
          </thead>
          <tbody>
            {data.installations.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-neutral-500">
                  Belum ada part yang tercatat terpasang.
                </td>
              </tr>
            ) : (
              data.installations.map((installation) => {
                const history = data.historical_part_lifetime.find((row) => row.part_id === installation.part_id)
                const tags = [installation.has_passport && 'Passport', installation.was_repaired && 'Bekas Repair']
                  .filter(Boolean)
                  .join(', ')
                return (
                  <tr key={installation.id} className="border-b border-neutral-200 break-inside-avoid">
                    <td className="py-1.5 pl-2">{installation.equipment_name ?? '-'}</td>
                    <td className="py-1.5">
                      {installation.part_name ?? '-'}
                      {tags && <span className="text-xs text-neutral-500"> ({tags})</span>}
                    </td>
                    <td className="py-1.5 text-xs text-neutral-500">{fmtDate(installation.installed_at)}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {installation.percent_used != null
                        ? `Sisa ${Math.max(0, 100 - Math.round(installation.percent_used))}%`
                        : installation.age_in_runtime_hours != null
                          ? `${installation.age_in_runtime_hours} jam`
                          : '-'}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{history ? `${history.average_runtime_hours} jam` : '-'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {data.installations.some((installation) => installation.has_passport) && (
        <div>
          <h2 className="mb-1.5 text-xs font-semibold tracking-wide text-neutral-600 uppercase">
            Riwayat Part Passport Terpasang
          </h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-neutral-800 bg-neutral-50 text-left text-xs font-semibold tracking-wide text-neutral-600 uppercase">
                <th className="py-2 pl-2">Equipment</th>
                <th className="py-2">Part</th>
                <th className="py-2">Unit</th>
                <th className="py-2">Pasang</th>
                <th className="py-2 pr-2">Lepas</th>
              </tr>
            </thead>
            <tbody>
              {data.passport_install_history.map((row) => (
                <tr key={row.id} className="border-b border-neutral-200 break-inside-avoid">
                  <td className="py-1.5 pl-2">{row.equipment_name}</td>
                  <td className="py-1.5">{row.part_name}</td>
                  <td className="py-1.5 font-mono text-xs text-neutral-500">{row.unit_code}</td>
                  <td className="py-1.5 text-xs text-neutral-500">{fmtDate(row.installed_at)}</td>
                  <td className="py-1.5 pr-2 text-xs text-neutral-500">
                    {row.is_active ? 'Masih terpasang' : row.removed_at ? fmtDate(row.removed_at) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
