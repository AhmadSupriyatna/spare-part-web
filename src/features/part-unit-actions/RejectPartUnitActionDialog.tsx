import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { rejectPartUnitActionRequest } from '@/features/part-unit-actions/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface RejectPartUnitActionDialogProps {
  requestId: number
  branchId: number
}

export function RejectPartUnitActionDialog({ requestId, branchId }: RejectPartUnitActionDialogProps) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => rejectPartUnitActionRequest(requestId, notes || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-unit-action-requests', branchId] })
      toast.success('Permintaan ditolak.')
      setNotes('')
      setOpen(false)
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menolak permintaan.'
      toast.error(message)
      queryClient.invalidateQueries({ queryKey: ['part-unit-action-requests', branchId] })
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Tolak</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tolak Permintaan</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="reject-notes">Alasan penolakan (opsional)</Label>
            <Textarea id="reject-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Menyimpan...' : 'Tolak Permintaan'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
