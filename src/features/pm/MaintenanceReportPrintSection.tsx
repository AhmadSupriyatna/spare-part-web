import { QRCodeSVG } from 'qrcode.react'
import { Fragment } from 'react'
import type { CompanySetting } from '@/types/settings'
import type { Task } from '@/types/tasks'

export interface MaintenanceReportSection {
  /** A sub-heading like "Minggu ke-2 (8 Sep – 14 Sep 2026)" for a monthly report's weeks — omitted entirely for a weekly report, which has only one section. */
  heading?: string
  tasks: Task[]
}

interface MaintenanceReportPrintSectionProps {
  title: string
  branchName?: string | null
  lineName?: string | null
  machineName?: string | null
  periodLabel: string
  runtimeHours: number | null
  supervisorName?: string | null
  /** The QR Validator's scan URL — omitted on the digital (already-scanned) view, since a QR pointing back to itself has no purpose there. */
  scanUrl?: string | null
  sections: MaintenanceReportSection[]
  companySetting?: CompanySetting
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'

/** Actual elapsed time (started_at → completed_at), in whole minutes — never an estimate, and never guessed when either timestamp is missing. */
function durationMinutes(task: Task): number | null {
  if (!task.started_at || !task.completed_at) return null
  const ms = new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()
  return Math.max(0, Math.round(ms / 60000))
}

interface DetailRow {
  key: string
  label: string
  /** null = not yet decided (task still pending/in progress). */
  resultOk: boolean | null
  note: string
}

/**
 * One row per condition-check item, plus one row per planned part — never
 * lumped into a single task-wide summary, since each part is its own
 * checklist entry with its own outcome. A part's Kondisi reads as "was it
 * still fine, or did it need replacing": Tidak if that specific part was
 * actually replaced (that's precisely why it was replaced), Baik if it
 * turned out not to need it. A task's full scope of work belongs on the
 * report inline, not behind a separate print.
 */
function detailRowsFor(task: Task): DetailRow[] {
  const isDone = task.status === 'completed'
  const rows: DetailRow[] = []

  for (const item of task.checklist_items ?? []) {
    rows.push({
      key: `item-${item.id}`,
      label: item.description,
      resultOk: item.condition_ok,
      note: item.notes ?? '',
    })
  }

  // Only disambiguate by unit/slot when the same part appears more than
  // once on this task ("satu baris satu alamat" — each row is a distinct
  // physical address) — otherwise it's just noise. Never a guessed ordinal
  // when slot_label isn't available (e.g. a "not replaced" row never
  // recorded which unit it was): the suffix is simply omitted then.
  const partChecks = task.part_checks ?? []
  const countByPartId = new Map<number, number>()
  for (const check of partChecks) {
    countByPartId.set(check.part_id, (countByPartId.get(check.part_id) ?? 0) + 1)
  }

  for (const check of partChecks) {
    const partLabel = check.part_name ?? `Part #${check.part_id}`
    const isDuplicatePart = (countByPartId.get(check.part_id) ?? 0) > 1
    const unitSuffix = isDuplicatePart && check.slot_label ? ` — Unit ${check.slot_label}` : ''
    const outcome = !isDone
      ? 'Direncanakan diganti.'
      : check.is_replaced
        ? `Diganti (Qty ${check.quantity_used ?? '-'}).`
        : `Tidak diganti${check.reason ? ` karena ${check.reason}` : ''}.`

    rows.push({
      key: `part-${check.id}`,
      label: `Ganti ${partLabel}`,
      resultOk: isDone ? !check.is_replaced : null,
      note: `${outcome}${unitSuffix}`,
    })
  }

  return rows
}

function SectionTable({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">Tidak ada WO pada periode ini.</p>
  }

  return (
    <table className="w-full border-collapse text-left text-xs">
      <thead>
        <tr className="bg-muted/50">
          <th className="w-8 border px-1.5 py-1 text-center">No.</th>
          <th className="border px-1.5 py-1">Deskripsi Kegiatan</th>
          <th className="w-12 border px-1 py-1 text-center">Baik</th>
          <th className="w-12 border px-1 py-1 text-center">Tidak</th>
          <th className="border px-1.5 py-1">Tindakan / Perbaikan / Keterangan</th>
          <th className="w-28 border px-1.5 py-1 text-center">PIC</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task, taskIndex) => {
          const isDone = task.status === 'completed'
          const rows = detailRowsFor(task)
          const duration = durationMinutes(task)
          // The header (equipment/WO identity) is always its own row, fully
          // separate from the checklist items below it — a sub-item's
          // Baik/Tidak must line up with that item alone, never appear to
          // belong to the header line above it.
          const contentRowCount = Math.max(rows.length, 1)
          const noCell = (
            <td className="border px-1.5 py-1 text-center align-top font-semibold" rowSpan={contentRowCount + 1}>
              {taskIndex + 1}
            </td>
          )
          const picCell = (
            <td className="border px-1.5 py-1 text-center align-top" rowSpan={contentRowCount + 1}>
              <p className="font-medium">{task.assignee_name ?? '-'}</p>
              <p className="text-muted-foreground">
                {task.completed_at ? new Date(task.completed_at).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
              </p>
            </td>
          )

          return (
            <Fragment key={task.id}>
              <tr className="bg-muted/30">
                {noCell}
                <td className="border px-1.5 py-1 font-semibold" colSpan={4}>
                  {task.machine_name ? `${task.machine_name} — ` : ''}
                  {task.equipment_name} <span className="font-normal italic">{task.title}</span>
                  <span className="font-normal text-muted-foreground">
                    {' '}
                    - Duration: {duration != null ? `${duration} menit` : '-'} (WO #{task.id})
                  </span>
                </td>
                {picCell}
              </tr>
              {rows.length === 0 ? (
                <tr>
                  <td className="border px-1.5 py-1 align-top text-muted-foreground" colSpan={4}>
                    Tidak ada checklist pada WO ini.
                  </td>
                </tr>
              ) : (
                rows.map((row, rowIndex) => (
                  <tr key={row.key}>
                    <td className="border py-1 pr-1.5 pl-4 align-top">
                      {LETTERS[rowIndex] ?? rowIndex + 1}. {row.label}
                    </td>
                    <td className="border px-1 py-1 text-center align-top">{!isDone ? '☐' : row.resultOk === true ? '✓' : ''}</td>
                    <td className="border px-1 py-1 text-center align-top">{!isDone ? '☐' : row.resultOk === false ? '✓' : ''}</td>
                    <td className="border px-1.5 py-1 align-top">{row.note}</td>
                  </tr>
                ))
              )}
            </Fragment>
          )
        })}
      </tbody>
    </table>
  )
}

/**
 * Laporan Pemeriksaan Mesin — every WO for a chosen Machine or Line, over a
 * chosen week or month, on a single printed document. Laid out like the
 * standard "Form Pemeriksaan Mesin": rows grouped by Equipment, each group
 * numbered and its work items lettered, with Kondisi Baik/Tidak columns. A
 * monthly report stacks each week as its own numbered section rather than
 * a side-by-side grid, so it stays legible regardless of how many weeks the
 * month has. Every WO's full scope of work (condition-check items and/or
 * planned parts) renders inline — this is the one and only printed output
 * for a WO's checklist. Reused as-is for the QR Validator's digital view
 * (see MaintenanceReportScanPage) — same component, just no scanUrl.
 */
export function MaintenanceReportPrintSection({
  title,
  branchName,
  lineName,
  machineName,
  periodLabel,
  runtimeHours,
  supervisorName,
  scanUrl,
  sections,
  companySetting,
}: MaintenanceReportPrintSectionProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 text-sm">
      <div className="flex h-14 items-center justify-between gap-4 border-b pb-3">
        <div className="flex h-full items-center gap-2">
          {companySetting?.logo_url ? (
            <img src={companySetting.logo_url} alt="" className="h-10 w-auto object-contain" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded border border-dashed text-[9px] text-muted-foreground">
              Logo
            </div>
          )}
          <div>
            <p className="font-semibold">{companySetting?.name ?? 'Nama Perusahaan'}</p>
            <p className="text-xs text-muted-foreground">{branchName ?? '-'}</p>
          </div>
        </div>
        {scanUrl && (
          <div className="flex h-full items-center">
            <QRCodeSVG value={scanUrl} size={56} />
          </div>
        )}
      </div>

      <p className="text-center text-base font-bold tracking-wide uppercase">{title}</p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-b pb-3 text-xs">
        <div className="flex flex-col gap-1">
          <p className="flex gap-1">
            <span className="inline-block w-12 shrink-0 text-right text-muted-foreground">Line</span>
            <span className="text-muted-foreground">:</span>
            <span className="font-medium">{lineName ?? '-'}</span>
          </p>
          <p className="flex gap-1">
            <span className="inline-block w-12 shrink-0 text-right text-muted-foreground">Mesin</span>
            <span className="text-muted-foreground">:</span>
            <span className="font-medium">{machineName ?? 'Semua Mesin'}</span>
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="flex gap-1">
            <span className="inline-block w-32 shrink-0 text-right text-muted-foreground">Running Hours (Line)</span>
            <span className="text-muted-foreground">:</span>
            <span className="font-medium">{runtimeHours != null ? `${runtimeHours.toLocaleString('id-ID')} jam` : '-'}</span>
          </p>
          <p className="flex gap-1">
            <span className="inline-block w-32 shrink-0 text-right text-muted-foreground">Periode</span>
            <span className="text-muted-foreground">:</span>
            <span className="font-medium">{periodLabel}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {sections.map((section, i) => (
          <div key={section.heading ?? i} className="flex flex-col gap-1.5">
            {section.heading && <p className="font-semibold">{section.heading}</p>}
            <SectionTable tasks={section.tasks} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 border-t pt-3 text-xs">
        <div>
          <p className="mb-1 font-semibold">Keterangan:</p>
          <ul className="list-disc pl-4 text-muted-foreground">
            <li>Beri tanda centang (✓) pada kolom "Kondisi".</li>
            <li>Jika kondisi Tidak, isi kolom "Tindakan/Perbaikan/Keterangan".</li>
          </ul>
        </div>
        <div className="flex justify-end">
          <div className="text-center">
            <p className="mb-10">Diperiksa oleh:</p>
            <p className="border-t px-8 pt-1 font-medium">{supervisorName ?? ' '}</p>
            <p className="text-muted-foreground">SPV Teknik</p>
          </div>
        </div>
      </div>
    </div>
  )
}
