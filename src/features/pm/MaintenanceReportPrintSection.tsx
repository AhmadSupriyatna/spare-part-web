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
  periodLabelCaption?: string
  runtimeHours: number | null
  supervisorName?: string | null
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

function executionDateLabel(task: Task): string {
  const started = task.started_at ? new Date(task.started_at) : null
  const completed = task.completed_at ? new Date(task.completed_at) : null
  const format = (date: Date) => date.toLocaleDateString('id-ID', { dateStyle: 'medium' })

  if (started && completed && started.toDateString() !== completed.toDateString()) {
    return `${format(started)} – ${format(completed)}`
  }
  if (completed) return format(completed)
  if (started) return format(started)
  if (task.due_date) return `${format(new Date(task.due_date))} (jadwal)`
  return '-'
}

interface DetailRow {
  key: string
  itemId: number
  label: string
  /** null = not yet decided (task still pending/in progress). */
  resultOk: boolean | null
  note: string
}

function conditionRowsFor(task: Task): DetailRow[] {
  return (task.checklist_items ?? []).map((item) => ({
    key: `item-${item.id}`,
    itemId: item.id,
    label: item.description,
    resultOk: item.condition_ok,
    note: item.notes ?? '',
  }))
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
          <th className="border px-1.5 py-1">Tindak Lanjut</th>
          <th className="border px-1.5 py-1">Keterangan</th>
          <th className="w-24 border px-1.5 py-1 text-center">Tgl. Pelaksanaan</th>
          <th className="w-28 border px-1.5 py-1 text-center">PIC</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task, taskIndex) => {
          const isDone = task.status === 'completed'
          const conditionRows = conditionRowsFor(task)
          const partChecks = task.part_checks ?? []
          const checklistItemIds = new Set(conditionRows.map((row) => row.itemId))
          const unlinkedPartChecks = partChecks.filter(
            (check) => check.task_checklist_item_id == null || !checklistItemIds.has(check.task_checklist_item_id),
          )
          const duration = durationMinutes(task)
          // The header (equipment/WO identity) is always its own row, fully
          // separate from the checklist items below it — a sub-item's
          // Baik/Tidak must line up with that item alone, never appear to
          // belong to the header line above it.
          const contentRowCount =
            Math.max(conditionRows.length, 1) +
            (conditionRows.length > 0 && unlinkedPartChecks.length > 0 ? 1 : 0)
          const noCell = (
            <td className="border px-1.5 py-1 text-center align-top font-semibold" rowSpan={contentRowCount + 1}>
              {taskIndex + 1}
            </td>
          )
          const picCell = (
            <td className="border px-1.5 py-1 text-center align-top" rowSpan={contentRowCount + 1}>
              <p className="font-medium">{task.assignee_name ?? '-'}</p>
            </td>
          )
          const executionDateCell = (
            <td className="border px-1.5 py-1 text-center align-top" rowSpan={contentRowCount + 1}>
              {executionDateLabel(task)}
            </td>
          )

          return (
            <Fragment key={task.id}>
              <tr className="bg-muted/30">
                {noCell}
                <td className="border px-1.5 py-1 font-semibold" colSpan={5}>
                  {task.machine_name ? `${task.machine_name} — ` : ''}
                  {task.equipment_name} <span className="font-normal italic">{task.title}</span>
                  <span className="font-normal text-muted-foreground">
                    {' '}
                    - Duration: {duration != null ? `${duration} menit` : '-'} (WO #{task.id})
                  </span>
                </td>
                {executionDateCell}
                {picCell}
              </tr>
              {conditionRows.length === 0 ? (
                <tr>
                  <td className="border px-1.5 py-1 align-top text-muted-foreground">
                    Tidak ada pengecekan kondisi pada WO ini.
                  </td>
                  <td className="border px-1 py-1 text-center align-top">{!isDone ? '☐' : ''}</td>
                  <td className="border px-1 py-1 text-center align-top">{!isDone ? '☐' : ''}</td>
                  <td className="border px-1.5 py-1 align-top">
                    {unlinkedPartChecks.length > 0 && (
                      <PartFollowUpList
                        checks={unlinkedPartChecks}
                        isDone={isDone}
                      />
                    )}
                  </td>
                  <td className="border px-1.5 py-1 align-top">
                    {unlinkedPartChecks.length > 0 && (
                      <PartRemarksList checks={unlinkedPartChecks} isDone={isDone} />
                    )}
                  </td>
                </tr>
              ) : (
                conditionRows.map((row, rowIndex) => {
                  const checks = partChecks.filter((check) => check.task_checklist_item_id === row.itemId)

                  return (
                    <tr key={row.key}>
                      <td className="border py-1 pr-1.5 pl-4 align-top">
                        {LETTERS[rowIndex] ?? rowIndex + 1}. {row.label}
                      </td>
                      <td className="border px-1 py-1 text-center align-top">{!isDone ? '☐' : row.resultOk === true ? '✓' : ''}</td>
                      <td className="border px-1 py-1 text-center align-top">{!isDone ? '☐' : row.resultOk === false ? '✓' : ''}</td>
                      <td className="border px-1.5 py-1 align-top">
                        {row.resultOk !== true && (
                          <>
                            {row.note && <p className={checks.length > 0 ? 'mb-1.5' : ''}>{row.note}</p>}
                            {checks.length > 0 && <PartFollowUpList checks={checks} isDone={isDone} />}
                          </>
                        )}
                      </td>
                      <td className="border px-1.5 py-1 align-top">
                        {row.resultOk !== true && checks.length > 0 && (
                          <PartRemarksList checks={checks} isDone={isDone} />
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
              {conditionRows.length > 0 && unlinkedPartChecks.length > 0 && (
                <tr>
                  <td className="border px-1.5 py-1 align-top text-muted-foreground">Part tanpa pengecekan kondisi terkait.</td>
                  <td className="border px-1 py-1 text-center align-top" />
                  <td className="border px-1 py-1 text-center align-top" />
                  <td className="border px-1.5 py-1 align-top">
                    <PartFollowUpList checks={unlinkedPartChecks} isDone={isDone} />
                  </td>
                  <td className="border px-1.5 py-1 align-top">
                    <PartRemarksList checks={unlinkedPartChecks} isDone={isDone} />
                  </td>
                </tr>
              )}
            </Fragment>
          )
        })}
      </tbody>
    </table>
  )
}

function partPrefix(index: number): string {
  let prefix = ''
  let value = index + 1
  while (value > 0) {
    value -= 1
    prefix = String.fromCharCode(65 + (value % 26)) + prefix
    value = Math.floor(value / 26)
  }
  return prefix
}

function partIdentity(check: NonNullable<Task['part_checks']>[number]): string {
  return [check.item_master_no, check.part_name ?? `Part #${check.part_id}`].filter(Boolean).join(' — ')
}

function PartFollowUpList({
  checks,
  isDone,
}: {
  checks: NonNullable<Task['part_checks']>
  isDone: boolean
}) {
  return (
    <div>
      {checks.map((check, partIndex) => {
        const followUp = !isDone
          ? 'Rencana penggantian part'
          : check.is_replaced
            ? 'Penggantian part'
            : 'Tidak ada penggantian part'

        return (
          <div key={check.id} className={cnPartRow(partIndex)}>
            {partPrefix(partIndex)}. {followUp}
          </div>
        )
      })}
    </div>
  )
}

function cnPartRow(index: number): string {
  return index === 0 ? 'py-0.5' : 'border-t border-dashed py-0.5'
}

function PartRemarksList({
  checks,
  isDone,
}: {
  checks: NonNullable<Task['part_checks']>
  isDone: boolean
}) {
  return (
    <div>
      {checks.map((check, partIndex) => {
        const position = check.slot_label ? ` — Posisi ${check.slot_label}` : ''
        const outcome = !isDone
          ? `Direncanakan diganti${position}.`
          : check.is_replaced
            ? `Diganti${position}${check.quantity_used != null ? ` (Qty ${check.quantity_used})` : ''}.`
            : `Tidak diganti${check.reason ? ` — Alasan: ${check.reason}` : ''}.`

        return (
          <div key={check.id} className={cnPartRow(partIndex)}>
            {partPrefix(partIndex)}. {partIdentity(check)} — {outcome}
          </div>
        )
      })}
    </div>
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
 * for a WO's checklist. Reused as-is for the digital report view
 * (see MaintenanceReportScanPage).
 */
export function MaintenanceReportPrintSection({
  title,
  branchName,
  lineName,
  machineName,
  periodLabel,
  periodLabelCaption = 'Periode',
  runtimeHours,
  supervisorName,
  sections,
  companySetting,
}: MaintenanceReportPrintSectionProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 text-sm">
      <div className="flex h-14 items-center gap-4 border-b pb-3">
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
      </div>

      <p className="text-center text-base font-bold tracking-wide uppercase">{title}</p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-b pb-3 text-xs">
        <div className="grid grid-cols-[max-content_0.75rem_minmax(0,1fr)] content-start gap-y-1">
          <span className="text-muted-foreground">Line</span>
          <span className="text-center text-muted-foreground">:</span>
          <span className="font-medium">{lineName ?? '-'}</span>
          <span className="text-muted-foreground">Mesin</span>
          <span className="text-center text-muted-foreground">:</span>
          <span className="font-medium">{machineName ?? 'Semua Mesin'}</span>
        </div>
        <div className="grid grid-cols-[max-content_0.75rem_minmax(0,1fr)] content-start gap-y-1">
          <span className="text-muted-foreground">Running Hours (Line)</span>
          <span className="text-center text-muted-foreground">:</span>
          <span className="font-medium">
            {runtimeHours != null ? `${runtimeHours.toLocaleString('id-ID')} jam` : '-'}
          </span>
          <span className="text-muted-foreground">{periodLabelCaption}</span>
          <span className="text-center text-muted-foreground">:</span>
          <span className="font-medium">{periodLabel}</span>
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
            <li>Jika kondisi Tidak, isi kolom "Tindak Lanjut" dengan tindakan yang dilakukan.</li>
            <li>Kolom "Keterangan" menampilkan part yang diganti atau alasan part tidak diganti.</li>
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
