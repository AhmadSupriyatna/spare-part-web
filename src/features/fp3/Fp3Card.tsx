import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Fp3CompleteDialog } from '@/features/fp3/Fp3CompleteDialog'
import { cancelFp3Request, receiveFp3Request, type Fp3Request } from '@/features/fp3/api'
import { useAuthStore } from '@/stores/auth-store'
import { useHasRole } from '@/stores/use-has-role'
import { dueDateBadge } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const statusLabels: Record<Fp3Request['status'], string> = {
  pending: 'Belum Diterima',
  in_progress: 'Sedang Dikerjakan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

const dispositionLabels: Record<NonNullable<Fp3Request['disposition']>, string> = {
  open: 'Open',
  closed: 'Closed',
  closed_with_note: 'Closed with Note',
}

interface Fp3CardProps {
  fp3: Fp3Request
  invalidateKey: unknown[]
}

/** One FP3 request as a self-contained card — mirrors WoCard's claim/complete shape, simpler (no part checklist, just Terima -> Laporkan). */
export function Fp3Card({ fp3, invalidateKey }: Fp3CardProps) {
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((state) => state.user?.id)
  const canClaim = useHasRole(['engineer', 'supervisor', 'superadmin'])
  const isMine = fp3.received_by === currentUserId
  const canAct = isMine || (fp3.received_by === null && canClaim)
  const isDone = fp3.status === 'completed' || fp3.status === 'cancelled'
  const dueBadge = dueDateBadge(fp3.due_date)

  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false)
  const [dueDate, setDueDate] = useState('')

  function reportError(error: unknown, fallback: string) {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
    toast.error(message)
  }

  const receiveMutation = useMutation({
    mutationFn: () => receiveFp3Request(fp3.id, dueDate || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      toast.success('FP3 diterima.')
      setReceiveDialogOpen(false)
      setDueDate('')
    },
    onError: (error: unknown) => reportError(error, 'Gagal menerima FP3.'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelFp3Request(fp3.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      toast.success('FP3 dibatalkan.')
    },
    onError: (error: unknown) => reportError(error, 'Gagal membatalkan FP3.'),
  })

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <img src={fp3.request_photo_url} alt="" className="size-12 shrink-0 rounded-md border object-cover" />
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">{fp3.code}</p>
            <p className="truncate font-medium">{fp3.requester_name}</p>
            <p className="truncate text-xs text-muted-foreground">{fp3.department}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge
            variant={
              fp3.status === 'completed'
                ? 'success'
                : fp3.status === 'cancelled'
                  ? 'secondary'
                  : fp3.is_overdue
                    ? 'destructive'
                    : 'secondary'
            }
          >
            {fp3.is_overdue && !isDone ? 'Terlambat' : statusLabels[fp3.status]}
          </Badge>
          {fp3.disposition && <Badge variant="outline">{dispositionLabels[fp3.disposition]}</Badge>}
        </div>
      </div>

      <p className={cn('text-sm', !isDone && 'line-clamp-2')}>{fp3.description}</p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span>Diterima oleh: {fp3.received_by_name ?? 'Belum diterima'}</span>
        {isDone ? (
          <span>Jadwal: {fp3.due_date ? new Date(fp3.due_date).toLocaleDateString('id-ID') : '-'}</span>
        ) : (
          dueBadge && <Badge variant={dueBadge.variant}>{dueBadge.label}</Badge>
        )}
      </div>

      {isDone && fp3.work_description && (
        <div className="flex flex-col gap-1 rounded-md bg-muted/40 p-2 text-sm">
          <p className="font-medium">Uraian Pekerjaan</p>
          <p className="text-muted-foreground">{fp3.work_description}</p>
          {fp3.executor_names && <p className="text-xs text-muted-foreground">Pelaksana: {fp3.executor_names}</p>}
          {(fp3.part_usages?.length ?? 0) > 0 && (
            <ul className="mt-1 flex flex-col gap-0.5">
              {fp3.part_usages?.map((usage) => (
                <li key={usage.id} className="text-xs text-muted-foreground">
                  {usage.part_name} × {usage.quantity}
                </li>
              ))}
            </ul>
          )}
          {fp3.completion_photo_url && (
            <img src={fp3.completion_photo_url} alt="Foto hasil" className="mt-1 max-h-32 rounded-md border object-cover" />
          )}
        </div>
      )}

      {canAct && !isDone && (
        <div className="flex justify-end gap-2 border-t pt-3">
          <Button size="sm" variant="ghost" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
            Batal
          </Button>
          {fp3.status === 'pending' && (
            <Button size="sm" variant="outline" onClick={() => setReceiveDialogOpen(true)}>
              Terima
            </Button>
          )}
          <Fp3CompleteDialog
            fp3={fp3}
            invalidateKeys={[invalidateKey]}
            trigger={<Button size="sm">Laporkan</Button>}
          />
        </div>
      )}

      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Terima FP3</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fp3-due-date">Jadwalkan (opsional)</Label>
            <Input id="fp3-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Kosongkan kalau langsung dikerjakan sekarang, atau pilih tanggal untuk dijadwalkan nanti.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReceiveDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => receiveMutation.mutate()} disabled={receiveMutation.isPending}>
              {receiveMutation.isPending ? 'Menyimpan...' : 'Terima'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
