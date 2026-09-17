import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { taskSource } from '@/features/pm/taskColors'
import { cancelTask, completeTask, startTask } from '@/features/tasks/api'
import { useAuthStore } from '@/stores/auth-store'
import { useHasRole } from '@/stores/use-has-role'
import { dueDateBadge } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { Task } from '@/types/tasks'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const statusLabels: Record<Task['status'], string> = {
  pending: 'Belum Mulai',
  in_progress: 'Sedang Dikerjakan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

const sourceDotClass: Record<ReturnType<typeof taskSource>, string> = {
  library: 'bg-primary',
  lifetime: 'bg-warning',
  breakdown: 'bg-destructive',
}

interface ChecklistRowState {
  checked: boolean
  qty: string
}

interface WoCardProps {
  task: Task
  invalidateKey: unknown[]
}

/**
 * One WO as a self-contained card — no more modal for completion. A part
 * check is now just a checkbox (green once ticked) with a quick quantity
 * field, no QR scan: it submits with part_unit_id/old_installation_id both
 * null, so TaskService::completeChecklist() treats it as "new part off the
 * shelf" (only throws if the equipment has more than one active
 * installation of that exact part, since then there's no way to tell which
 * one is coming off without picking one explicitly).
 */
export function WoCard({ task, invalidateKey }: WoCardProps) {
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((state) => state.user?.id)
  const canClaim = useHasRole(['engineer', 'supervisor', 'superadmin'])
  const isMine = task.assigned_to === currentUserId
  const canAct = isMine || (task.assigned_to === null && canClaim)
  const isDone = task.status === 'completed' || task.status === 'cancelled'
  const source = taskSource(task)
  const dueBadge = dueDateBadge(task.due_date)

  const [rows, setRows] = useState<Record<number, ChecklistRowState>>({})
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [keterangan, setKeterangan] = useState('')

  useEffect(() => {
    const next: Record<number, ChecklistRowState> = {}
    for (const check of task.part_checks ?? []) {
      next[check.part_id] = {
        checked: check.is_replaced ?? false,
        qty: String(check.quantity_used ?? check.quantity_planned),
      }
    }
    setRows(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, task.status])

  function reportError(error: unknown, fallback: string) {
    const message =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
    toast.error(message)
  }

  const startMutation = useMutation({
    mutationFn: () => startTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      toast.success('WO dimulai.')
    },
    onError: (error: unknown) => reportError(error, 'Gagal memulai WO.'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      toast.success('WO dibatalkan.')
    },
    onError: (error: unknown) => reportError(error, 'Gagal membatalkan WO.'),
  })

  const hasChecklist = (task.part_checks?.length ?? 0) > 0
  const anyNotReplaced = (task.part_checks ?? []).some((check) => !(rows[check.part_id]?.checked ?? false))
  const keteranganRequired = hasChecklist && anyNotReplaced

  const completeMutation = useMutation({
    mutationFn: (notes: string) =>
      hasChecklist
        ? completeTask(task.id, {
            notes: notes || undefined,
            checks: (task.part_checks ?? []).map((check) => {
              const row = rows[check.part_id]
              const checked = row?.checked ?? false
              return {
                part_id: check.part_id,
                is_replaced: checked,
                quantity_used: checked ? Number(row?.qty || check.quantity_planned) : null,
                reason: checked ? null : notes,
              }
            }),
          })
        : completeTask(task.id, {
            notes: notes || undefined,
            part_stock_id: task.part_stock_id ?? null,
            quantity_used: task.quantity_used ?? null,
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      toast.success('WO berhasil diselesaikan.')
      setCompleteDialogOpen(false)
      setKeterangan('')
    },
    onError: (error: unknown) => reportError(error, 'Gagal menyelesaikan WO.'),
  })

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', sourceDotClass[source])} />
          <div className="min-w-0">
            <p className="font-medium">{task.title}</p>
            <p className="text-xs text-muted-foreground">
              {task.equipment_name} · {task.machine_name} · {task.line_name}
            </p>
            {task.cause && <p className="text-xs text-muted-foreground">Penyebab: {task.cause}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge
            variant={
              task.status === 'completed'
                ? 'success'
                : task.status === 'cancelled'
                  ? 'secondary'
                  : task.is_overdue
                    ? 'destructive'
                    : 'secondary'
            }
          >
            {task.is_overdue && !isDone ? 'Terlambat' : statusLabels[task.status]}
          </Badge>
          {task.task_library_id && (
            <Button
              variant="ghost"
              size="icon-sm"
              nativeButton={false}
              aria-label="Cetak checklist WO"
              title="Cetak checklist WO"
              render={<Link to={`/pm/tasks/${task.id}/print`} />}
            >
              <Printer />
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span>Dikerjakan oleh: {task.assignee_name ?? 'Belum dikerjakan'}</span>
        {isDone ? (
          <span>Jatuh tempo: {task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID') : '-'}</span>
        ) : (
          dueBadge && <Badge variant={dueBadge.variant}>{dueBadge.label}</Badge>
        )}
      </div>

      {hasChecklist && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Ganti Part</p>
          {(task.part_checks ?? []).map((check) => {
            const row = rows[check.part_id] ?? { checked: false, qty: String(check.quantity_planned) }
            return (
              <div
                key={check.id}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-md border p-2 transition-colors',
                  row.checked && 'border-success bg-success/10',
                )}
              >
                <label className={cn('flex min-w-0 items-center gap-2 text-sm', canAct && !isDone && 'cursor-pointer')}>
                  <Checkbox
                    checked={row.checked}
                    disabled={!canAct || isDone}
                    onCheckedChange={(value) =>
                      setRows((prev) => ({ ...prev, [check.part_id]: { ...row, checked: value === true } }))
                    }
                  />
                  <span className="min-w-0 truncate">
                    {check.part_name ?? `Part #${check.part_id}`}{' '}
                    <span className="font-mono text-xs text-muted-foreground">({check.item_master_no})</span>
                  </span>
                </label>
                {row.checked && check.quantity_planned > 1 && (
                  <Input
                    type="number"
                    min={1}
                    disabled={!canAct || isDone}
                    className="h-7 w-16 shrink-0"
                    value={row.qty}
                    onChange={(e) =>
                      setRows((prev) => ({ ...prev, [check.part_id]: { ...row, qty: e.target.value } }))
                    }
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {canAct && !isDone && (
        <div className="flex justify-end gap-2 border-t pt-3">
          <Button size="sm" variant="ghost" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
            Batal
          </Button>
          {task.status === 'pending' && (
            <Button size="sm" variant="outline" onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
              Mulai
            </Button>
          )}
          <Button size="sm" onClick={() => setCompleteDialogOpen(true)}>
            Selesai
          </Button>
        </div>
      )}

      <Dialog
        open={completeDialogOpen}
        onOpenChange={(next) => {
          setCompleteDialogOpen(next)
          if (!next) setKeterangan('')
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Selesaikan WO</DialogTitle>
            <DialogDescription>
              {keteranganRequired
                ? 'Ada part yang tidak diganti — isi keterangan alasannya.'
                : 'Tambahkan keterangan kalau perlu, atau langsung simpan.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="wo-keterangan">Keterangan</Label>
            <Textarea
              id="wo-keterangan"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder={keteranganRequired ? 'Misal: part masih dalam kondisi baik' : 'Catatan (opsional)'}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setCompleteDialogOpen(false)
                setKeterangan('')
              }}
            >
              Batal
            </Button>
            <Button
              onClick={() => completeMutation.mutate(keterangan)}
              disabled={completeMutation.isPending || (keteranganRequired && !keterangan.trim())}
            >
              {completeMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
