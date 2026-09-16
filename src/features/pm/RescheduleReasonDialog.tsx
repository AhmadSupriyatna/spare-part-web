import { useState } from 'react'
import type { Task } from '@/types/tasks'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface PendingReschedule {
  task: Task
  newDate: string
  diffDays: number
}

interface RescheduleReasonDialogProps {
  pending: PendingReschedule | null
  onCancel: () => void
  onConfirm: (reason: string) => void
  isSubmitting?: boolean
}

/**
 * Shown only when a drag-to-reschedule shifts a task's date by more than 7
 * days — the backend rejects that shift without a reason anyway, so this
 * asks up front instead of letting the drop silently fail.
 */
export function RescheduleReasonDialog({ pending, onCancel, onConfirm, isSubmitting }: RescheduleReasonDialogProps) {
  const [reason, setReason] = useState('')

  return (
    <Dialog
      open={!!pending}
      onOpenChange={(open) => {
        if (!open) {
          setReason('')
          onCancel()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Geser Jadwal {pending?.diffDays} Hari</DialogTitle>
          <DialogDescription>
            "{pending?.task.title}" digeser ke{' '}
            {pending && new Date(pending.newDate).toLocaleDateString('id-ID', { dateStyle: 'long' })} — lebih dari 7
            hari dari jadwal semula, jadi perlu alasan.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="reschedule-reason">Alasan Reschedule</Label>
          <Textarea
            id="reschedule-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Misal: menunggu spare part datang"
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || isSubmitting}
          >
            {isSubmitting ? 'Menyimpan...' : 'Geser Jadwal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
