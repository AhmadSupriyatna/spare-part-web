import type { LineRuntimeLog } from '@/types/tasks'
import type { CompanySetting } from '@/types/settings'
import { cn } from '@/lib/utils'

interface LineRuntimeReportPrintSectionProps {
  lineName: string
  lineCode: string
  branchName?: string | null
  currentHours: number
  periodLabel: string
  logs: LineRuntimeLog[]
  companySetting?: CompanySetting
}

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="relative flex flex-col gap-0.5 rounded-lg border bg-neutral-50 px-3 py-2.5">
      <span className="absolute top-1 left-1 size-1 rounded-full bg-neutral-300" />
      <span className="absolute top-1 right-1 size-1 rounded-full bg-neutral-300" />
      <span className="absolute bottom-1 left-1 size-1 rounded-full bg-neutral-300" />
      <span className="absolute bottom-1 right-1 size-1 rounded-full bg-neutral-300" />
      <p className="text-[10px] font-medium tracking-wide text-neutral-500 uppercase">{label}</p>
      <p className="font-mono text-xl leading-tight font-bold text-neutral-900 tabular-nums">
        {value}
        {unit && <span className="ml-1 text-xs font-medium text-neutral-500">{unit}</span>}
      </p>
    </div>
  )
}

/**
 * "Cetak Report Running Hours Line" — a modern document, deliberately not
 * the dense bureaucratic-form table style of MaintenanceReportPrintSection
 * (that one mirrors a specific paper form; this is a fresh operational
 * report). Amber accent + rivet-corner stat cards reuse this session's
 * "plant engineer nameplate" language for visual continuity with the QR
 * labels, and each log entry renders as a rounded list-card row (same
 * family as ApprovalCard/StockRow) instead of a classic bordered grid.
 * No QR — unlike Maintenance Report/FP3/Machine Monitoring, this isn't a
 * scan-triggered document, just an internal printout.
 */
export function LineRuntimeReportPrintSection({
  lineName,
  lineCode,
  branchName,
  currentHours,
  periodLabel,
  logs,
  companySetting,
}: LineRuntimeReportPrintSectionProps) {
  const totalAdded = logs.reduce((sum, log) => sum + log.hours_added, 0)
  const avgPerEntry = logs.length > 0 ? Math.round(totalAdded / logs.length) : 0

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
          <p className="text-lg font-bold tracking-wide uppercase">Laporan Jam Operasional</p>
          <p className="text-xs text-neutral-500">
            {lineName} ({lineCode}) &middot; {periodLabel}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Jam Operasi Saat Ini" value={currentHours.toLocaleString('id-ID')} unit="jam" />
        <StatCard label="Penambahan Periode Ini" value={`+${totalAdded.toLocaleString('id-ID')}`} unit="jam" />
        <StatCard label="Jumlah Entri" value={String(logs.length)} />
        <StatCard label="Rata-rata / Entri" value={avgPerEntry.toLocaleString('id-ID')} unit="jam" />
      </div>

      <div className="flex flex-col gap-2">
        {logs.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-neutral-500">
            Tidak ada catatan jam operasi pada periode ini.
          </p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={cn('flex items-center justify-between gap-3 rounded-lg border px-3 py-2 break-inside-avoid')}
            >
              <div className="min-w-0">
                <p className="text-xs text-neutral-500">
                  {new Date(log.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
                <p className="font-medium">
                  {log.previous_hours.toLocaleString('id-ID')} → {log.new_hours.toLocaleString('id-ID')} jam
                  <span className="ml-2 font-mono text-emerald-700">+{log.hours_added}</span>
                </p>
                {log.notes && <p className="truncate text-xs text-neutral-500">{log.notes}</p>}
              </div>
              <p className="shrink-0 text-right text-xs text-neutral-500">{log.recorded_by_name ?? '-'}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
