import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { completeTask } from '@/features/tasks/api'
import type { Task } from '@/types/tasks'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface CheckState {
  part_id: number
  part_name: string
  item_master_no: string
  quantity_planned: number
  is_replaced: boolean | null
  quantity_used: string
  reason: string
}

interface CompleteChecklistDialogProps {
  task: Task
  invalidateKey: unknown[]
}

export function CompleteChecklistDialog({ task, invalidateKey }: CompleteChecklistDialogProps) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [checks, setChecks] = useState<CheckState[]>([])
  const queryClient = useQueryClient()

  useEffect(() => {
    if (open) {
      setChecks(
        (task.part_checks ?? []).map((check) => ({
          part_id: check.part_id,
          part_name: check.part_name ?? `Part #${check.part_id}`,
          item_master_no: check.item_master_no ?? '',
          quantity_planned: check.quantity_planned,
          is_replaced: check.is_replaced,
          quantity_used: String(check.quantity_used ?? check.quantity_planned),
          reason: check.reason ?? '',
        })),
      )
      setNotes('')
    }
  }, [open, task])

  const allDecided = checks.length > 0 && checks.every((c) => c.is_replaced !== null)
  const allValid = checks.every((c) => {
    if (c.is_replaced === null) return false
    if (c.is_replaced) return Number(c.quantity_used) > 0
    return c.reason.trim().length > 0
  })

  const mutation = useMutation({
    mutationFn: () =>
      completeTask(task.id, {
        notes: notes || undefined,
        checks: checks.map((c) => ({
          part_id: c.part_id,
          is_replaced: Boolean(c.is_replaced),
          quantity_used: c.is_replaced ? Number(c.quantity_used) : null,
          reason: c.is_replaced ? null : c.reason,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      toast.success('WO PM berhasil diselesaikan.')
      setOpen(false)
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menyelesaikan WO.'
      toast.error(message)
    },
  })

  function updateCheck(partId: number, patch: Partial<CheckState>) {
    setChecks((prev) => prev.map((c) => (c.part_id === partId ? { ...c, ...patch } : c)))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Selesai</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Checklist Penyelesaian WO PM</DialogTitle>
          <DialogDescription>
            Untuk tiap part, tandai apakah diganti. Kalau tidak diganti, alasan wajib diisi.
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
          {checks.map((check) => (
            <div key={check.part_id} className="flex flex-col gap-2 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{check.part_name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {check.item_master_no} · rencana × {check.quantity_planned}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={check.is_replaced === true ? 'default' : 'outline'}
                  onClick={() => updateCheck(check.part_id, { is_replaced: true })}
                >
                  Diganti
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={check.is_replaced === false ? 'default' : 'outline'}
                  onClick={() => updateCheck(check.part_id, { is_replaced: false })}
                >
                  Tidak Diganti
                </Button>
              </div>
              {check.is_replaced === true && (
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`qty-${check.part_id}`} className="text-xs">
                    Jumlah Dipakai
                  </Label>
                  <Input
                    id={`qty-${check.part_id}`}
                    type="number"
                    min={1}
                    className="w-24"
                    value={check.quantity_used}
                    onChange={(e) => updateCheck(check.part_id, { quantity_used: e.target.value })}
                  />
                </div>
              )}
              {check.is_replaced === false && (
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`reason-${check.part_id}`} className="text-xs">
                    Alasan Tidak Diganti
                  </Label>
                  <Textarea
                    id={`reason-${check.part_id}`}
                    value={check.reason}
                    onChange={(e) => updateCheck(check.part_id, { reason: e.target.value })}
                    placeholder="Misal: kondisi masih baik"
                  />
                </div>
              )}
            </div>
          ))}
          <div className="flex flex-col gap-2">
            <Label htmlFor="checklist-notes">Catatan (opsional)</Label>
            <Textarea
              id="checklist-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan umum pengerjaan"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!allDecided || !allValid || mutation.isPending}
          >
            {mutation.isPending ? 'Menyimpan...' : 'Tandai Selesai'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
