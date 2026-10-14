import { Fragment } from 'react'
import type { ProductionLine, Machine } from '@/types/tasks'
import type { CompanySetting } from '@/types/settings'
import type { MachineSummaryData } from '@/features/machines/api'
import { MachineReportPrintSection } from '@/features/machines/MachineReportPrintSection'

const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

interface LineAssetReportPrintSectionProps {
  line: ProductionLine
  machines: Machine[]
  machineReports: MachineSummaryData[]
  branchName?: string | null
  companySetting?: CompanySetting
}

export function LineAssetReportPrintSection({
  line,
  machines,
  machineReports,
  branchName,
  companySetting,
}: LineAssetReportPrintSectionProps) {
  const scheduledPmCount = machineReports.reduce((sum, report) => sum + report.upcoming_task_count, 0)
  const overduePmCount = machineReports.reduce((sum, report) => sum + report.overdue_task_count, 0)
  const equipmentCount = machineReports.reduce((sum, report) => sum + report.equipment_count, 0)
  const lifetimeSampleCount = machineReports.reduce((sum, report) => sum + report.lifetime_hours_sample_count, 0)
  const lifetimeHoursTotal = machineReports.reduce((sum, report) => sum + report.lifetime_hours_total, 0)
  const averageLifetimeHours =
    lifetimeSampleCount > 0 ? Math.round(lifetimeHoursTotal / lifetimeSampleCount) : null
  const installedPartValue = machineReports.reduce(
    (sum, report) => sum + Number(report.installed_part_value),
    0,
  )
  const topParts = new Map<
    number,
    { partName: string; itemMasterNo: string; quantity: number; cost: number }
  >()
  for (const report of machineReports) {
    for (const part of report.top_parts_consumed_this_year) {
      const current = topParts.get(part.part_id)
      if (current) {
        current.quantity += part.quantity
        current.cost += Number(part.cost ?? 0)
      } else {
        topParts.set(part.part_id, {
          partName: part.part_name,
          itemMasterNo: part.item_master_no,
          quantity: part.quantity,
          cost: Number(part.cost ?? 0),
        })
      }
    }
  }
  const topPartsThisYear = [...topParts.entries()]
    .map(([partId, part]) => ({ partId, ...part }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)
  const machineCosts = machineReports.map((report) => ({
    machineId: report.machine.id,
    machineName: report.machine.name,
    equipmentCosts: report.cost_by_equipment_this_year,
    total: report.cost_by_equipment_this_year.reduce((sum, row) => sum + Number(row.cost), 0),
  }))

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
          <p className="text-lg font-bold tracking-wide uppercase">Laporan Line</p>
          <p className="text-xs text-neutral-500">
            {line.name} ({line.code})
          </p>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <tbody>
          <tr className="border-b border-neutral-200">
            <td className="py-2 pr-2 font-medium text-neutral-600">Line</td>
            <td className="py-2 font-semibold">{line.name}</td>
            <td className="py-2 pr-2 pl-6 font-medium text-neutral-600">Kode</td>
            <td className="py-2 text-right font-mono text-xs">{line.code}</td>
          </tr>
          <tr className="border-b border-neutral-200">
            <td className="py-2 pr-2 font-medium text-neutral-600">Running Hours</td>
            <td className="py-2 tabular-nums">{Number(line.runtime_hours).toLocaleString('id-ID')} jam</td>
            <td className="py-2 pr-2 pl-6 font-medium text-neutral-600">PM Terjadwal</td>
            <td className="py-2 text-right tabular-nums">{scheduledPmCount}</td>
          </tr>
          <tr className="border-b border-neutral-200">
            <td className="py-2 pr-2 font-medium text-neutral-600">Machine</td>
            <td className="py-2 tabular-nums">{machines.length}</td>
            <td className="py-2 pr-2 pl-6 font-medium text-neutral-600">Equipment</td>
            <td className="py-2 text-right tabular-nums">{equipmentCount}</td>
          </tr>
          <tr className="border-b border-neutral-200">
            <td className="py-2 pr-2 font-medium text-neutral-600">PM Terlambat</td>
            <td className="py-2 tabular-nums">{overduePmCount}</td>
            <td className="py-2 pr-2 pl-6 font-medium text-neutral-600">Rata-rata Life Time Part</td>
            <td className="py-2 text-right tabular-nums">
              {averageLifetimeHours != null ? `${averageLifetimeHours.toLocaleString('id-ID')} jam` : '-'}
            </td>
          </tr>
          <tr className="border-b border-neutral-200">
            <td className="py-2 pr-2 font-medium text-neutral-600">Nilai Part Terpasang</td>
            <td className="py-2 font-semibold tabular-nums">{currencyFormatter.format(installedPartValue)}</td>
            <td className="py-2 pr-2 pl-6 font-medium text-neutral-600">Tahun Laporan</td>
            <td className="py-2 text-right tabular-nums">{new Date().getFullYear()}</td>
          </tr>
        </tbody>
      </table>

      <section>
        <h2 className="mb-1.5 text-xs font-semibold tracking-wide text-neutral-600 uppercase">
          Top Part Terpakai Tahun Ini
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
            {topPartsThisYear.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-neutral-500">
                  Belum ada pemakaian part tercatat tahun ini.
                </td>
              </tr>
            ) : (
              topPartsThisYear.map((part) => (
                <tr key={part.partId} className="break-inside-avoid border-b border-neutral-200">
                  <td className="py-1.5 pl-2 font-medium">{part.partName}</td>
                  <td className="py-1.5 font-mono text-xs text-neutral-500">{part.itemMasterNo}</td>
                  <td className="py-1.5 text-right tabular-nums">{part.quantity}</td>
                  <td className="py-1.5 pr-2 text-right font-semibold tabular-nums">
                    {currencyFormatter.format(part.cost)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-1.5 text-xs font-semibold tracking-wide text-neutral-600 uppercase">
          Konsumsi Biaya per Machine Tahun Ini
        </h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-neutral-800 bg-neutral-50 text-left text-xs font-semibold tracking-wide text-neutral-600 uppercase">
              <th className="py-2 pl-2">Machine</th>
              <th className="py-2">Equipment</th>
              <th className="py-2 pr-2 text-right">Biaya</th>
            </tr>
          </thead>
          <tbody>
            {machineCosts.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-4 text-center text-neutral-500">
                  Belum ada Machine pada Line ini.
                </td>
              </tr>
            ) : (
              machineCosts.map((machine) => (
                <Fragment key={machine.machineId}>
                  {machine.equipmentCosts.length === 0 ? (
                    <tr className="break-inside-avoid border-b border-neutral-200">
                      <td className="py-1.5 pl-2 font-medium">{machine.machineName}</td>
                      <td className="py-1.5 text-neutral-500">Belum ada konsumsi</td>
                      <td className="py-1.5 pr-2 text-right font-semibold tabular-nums">
                        {currencyFormatter.format(machine.total)}
                      </td>
                    </tr>
                  ) : (
                    machine.equipmentCosts.map((equipment, index) => (
                      <tr key={equipment.equipment_id} className="break-inside-avoid border-b border-neutral-200">
                        <td className="py-1.5 pl-2 font-medium">{index === 0 ? machine.machineName : ''}</td>
                        <td className="py-1.5">{equipment.equipment_name}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">
                          {currencyFormatter.format(Number(equipment.cost))}
                        </td>
                      </tr>
                    ))
                  )}
                  <tr className="break-inside-avoid border-b-2 border-neutral-400 bg-neutral-50 font-semibold">
                    <td className="py-1.5 pl-2" colSpan={2}>Total {machine.machineName}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{currencyFormatter.format(machine.total)}</td>
                  </tr>
                </Fragment>
              ))
            )}
          </tbody>
          {machineCosts.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-neutral-800 font-bold">
                <td className="py-2 pl-2" colSpan={2}>Total Seluruh Machine</td>
                <td className="py-2 pr-2 text-right tabular-nums">
                  {currencyFormatter.format(machineCosts.reduce((sum, machine) => sum + machine.total, 0))}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </section>

      {machines.length === 0 ? (
        <p className="py-6 text-center text-neutral-500">Belum ada Machine di Line ini.</p>
      ) : (
        <>
          <h2 className="break-before-page border-t-2 border-neutral-300 pt-5 text-base font-bold">
            Rincian Part dan Riwayat per Machine
          </h2>
          {machineReports.map((report) => (
            <section key={report.machine.id} className="break-before-page border-t-2 border-neutral-300 pt-5">
              <MachineReportPrintSection data={report} companySetting={companySetting} />
            </section>
          ))}
        </>
      )}
    </div>
  )
}
