import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { rescheduleTask } from '@/features/tasks/api'
import { diffInDays, toDateKey } from '@/lib/dates'
import type { Task } from '@/types/tasks'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface RescheduleTaskDialogProps {
  task: Task | null
  onOpenChange: (open: boolean) => void
}

/**
 * Button-triggered counterpart to the Calendar's drag-to-reschedule — same
 * rule enforced server-side (RescheduleTaskRequest): a shift of more than 7
 * days from the current due date needs a reason. Picking the date directly
 * here instead of dragging the card, for the Task Detail drawer.
 */
export function RescheduleTaskDialog({ task, onOpenChange }: RescheduleTaskDialogProps) {
  const queryClient = useQueryClient()
  const [newDate, setNewDate] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (task?.due_date) setNewDate(toDateKey(new Date(task.due_date)))
    setReason('')
  }, [task])

  const diffDays = task?.due_date && newDate ? Math.abs(diffInDays(toDateKey(new Date(task.due_date)), newDate)) : 0
  const reasonRequired = diffDays > 7

  const mutation = useMutation({
    mutationFn: () => rescheduleTask(task!.id, newDate, reason || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task-reschedules'] })
      toast.success('Jadwal berhasil digeser.')
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menggeser jadwal.'
      toast.error(message)
    },
  })

  return (
    <Dialog open={!!task} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule "{task?.title}"</DialogTitle>
          <DialogDescription>Pilih tanggal jatuh tempo baru untuk task ini.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="reschedule-date">Tanggal Baru</Label>
          <Input id="reschedule-date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
        </div>
        {reasonRequired && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="reschedule-reason">Alasan Reschedule</Label>
            <Textarea
              id="reschedule-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Misal: menunggu spare part datang"
            />
            <p className="text-xs text-muted-foreground">Pergeseran lebih dari 7 hari wajib disertai alasan.</p>
          </div>
        )}
        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!newDate || (reasonRequired && !reason.trim()) || mutation.isPending}
          >
            {mutation.isPending ? 'Menyimpan...' : 'Geser Jadwal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
