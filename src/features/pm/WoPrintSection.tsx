import type { CompanySetting } from '@/types/settings'
import type { Task } from '@/types/tasks'

interface WoPrintSectionProps {
  task: Task
  companySetting?: CompanySetting
  /** Forces the next section onto a new printed page — used between WOs in a bulk print run. */
  pageBreakAfter?: boolean
}

/**
 * One WO's printable checklist — extracted out of PrintWoChecklistPage so
 * the same markup backs both the single-WO print route and the bulk one
 * (WoListView's "cetak N terpilih"), instead of duplicating it.
 */
export function WoPrintSection({ task, companySetting, pageBreakAfter }: WoPrintSectionProps) {
  const isDone = task.status === 'completed'

  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col gap-4 text-sm"
      style={pageBreakAfter ? { pageBreakAfter: 'always', breakAfter: 'page' } : undefined}
    >
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          {companySetting?.logo_url ? (
            <img src={companySetting.logo_url} alt="" className="h-10 w-auto object-contain" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded border border-dashed text-[9px] text-muted-foreground">
              Logo
            </div>
          )}
          <div>
            <p className="font-semibold">{companySetting?.name ?? 'Nama Perusahaan'}</p>
            <p className="text-xs text-muted-foreground">{task.branch_name}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold uppercase tracking-wide">WO PM Schedule</p>
          <p className="text-xs text-muted-foreground">WO #{task.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div>
          <p className="text-xs text-muted-foreground">Kegiatan</p>
          <p className="font-medium">{task.title}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Equipment</p>
          <p className="font-medium">
            {task.equipment_name} ({task.machine_name} / {task.line_name})
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Tanggal Jadwal</p>
          <p className="font-medium">{task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID') : '-'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ditugaskan ke</p>
          <p className="font-medium">{task.assignee_name ?? '-'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ditutup / Selesai</p>
          <p className="font-medium">
            {task.completed_at ? new Date(task.completed_at).toLocaleDateString('id-ID') : '-'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="font-medium">{isDone ? 'Selesai' : task.status}</p>
        </div>
      </div>

      {task.description && (
        <div>
          <p className="text-xs text-muted-foreground">Deskripsi</p>
          <p>{task.description}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide uppercase">
          {task.part_checks && task.part_checks.length > 0 ? 'Checklist Part' : 'Part'}
        </p>
        {task.part_checks && task.part_checks.length > 0 ? (
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b">
                <th className="py-1">Part</th>
                <th className="py-1 text-center">Diganti?</th>
                <th className="py-1 text-right">Qty</th>
              </tr>
            </thead>
            <tbody>
              {task.part_checks.map((check) => (
                <tr key={check.id} className="border-b">
                  <td className="py-1.5">
                    {check.part_name}
                    <div className="font-mono text-[10px] text-muted-foreground">{check.item_master_no}</div>
                  </td>
                  <td className="py-1.5 text-center">{isDone ? (check.is_replaced ? 'Ya' : 'Tidak') : '☐ Ya   ☐ Tidak'}</td>
                  <td className="py-1.5 text-right">{isDone ? (check.quantity_used ?? '-') : '____'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : task.part_name ? (
          <p className="text-xs">
            {task.part_name} ({task.item_master_no}) — Qty {task.quantity_used ?? '-'}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Tidak ada part terkait.</p>
        )}
      </div>

      {isDone && task.completion_notes && (
        <div>
          <p className="text-xs font-semibold tracking-wide uppercase">Keterangan</p>
          <p>{task.completion_notes}</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-8 text-xs">
        <div>
          <p className="mb-8">Dikerjakan oleh:</p>
          <p className="border-t pt-1">{task.assignee_name ?? '_________________________'}</p>
        </div>
        <div>
          <p className="mb-8">Diketahui oleh:</p>
          <p className="border-t pt-1">_________________________</p>
        </div>
      </div>
    </div>
  )
}
