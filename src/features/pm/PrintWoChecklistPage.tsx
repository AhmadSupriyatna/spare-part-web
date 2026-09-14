import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { fetchCompanySetting } from '@/features/settings/api'
import { fetchTask } from '@/features/tasks/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function PrintWoChecklistPage() {
  const { id } = useParams<{ id: string }>()
  const taskId = Number(id)

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => fetchTask(taskId),
  })

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  if (isLoading || !task) {
    return (
      <div className="p-6">
        <Skeleton className="h-96 w-full max-w-2xl" />
      </div>
    )
  }

  const isDone = task.status === 'completed'

  return (
    <div className="flex flex-col gap-4 p-6 print:p-0">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #wo-print-area, #wo-print-area * { visibility: visible; }
          #wo-print-area { position: absolute; inset: 0; padding: 24px; }
        }
      `}</style>

      <div className="flex justify-end print:hidden">
        <Button onClick={() => window.print()}>Cetak</Button>
      </div>

      <div id="wo-print-area" className="mx-auto flex w-full max-w-2xl flex-col gap-4 text-sm">
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
            <p className="font-medium">
              {task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID') : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ditugaskan ke</p>
            <p className="font-medium">{task.assignee_name ?? '-'}</p>
          </div>
        </div>

        {task.description && (
          <div>
            <p className="text-xs text-muted-foreground">Deskripsi</p>
            <p>{task.description}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-wide uppercase">Checklist Part</p>
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b">
                <th className="py-1">Part</th>
                <th className="py-1 text-right">Rencana</th>
                <th className="py-1 text-center">Diganti?</th>
                <th className="py-1 text-right">Dipakai</th>
                <th className="py-1">Alasan (jika tidak)</th>
              </tr>
            </thead>
            <tbody>
              {task.part_checks?.map((check) => (
                <tr key={check.id} className="border-b">
                  <td className="py-1.5">
                    {check.part_name}
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {check.item_master_no}
                    </div>
                  </td>
                  <td className="py-1.5 text-right">{check.quantity_planned}</td>
                  <td className="py-1.5 text-center">
                    {isDone ? (check.is_replaced ? 'Ya' : 'Tidak') : '☐ Ya   ☐ Tidak'}
                  </td>
                  <td className="py-1.5 text-right">{isDone ? (check.quantity_used ?? '-') : '____'}</td>
                  <td className="py-1.5">{isDone ? (check.reason ?? '-') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isDone && task.completion_notes && (
          <div>
            <p className="text-xs text-muted-foreground">Catatan Penyelesaian</p>
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
    </div>
  )
}
