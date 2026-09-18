import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
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

interface DeleteWithPasswordDialogProps {
  title: string
  description: string
  onConfirm: (password: string) => Promise<void>
  onSuccess: () => void
  trigger: React.ReactNode
  /** Defaults to "Hapus Permanen" — override for a non-delete action (e.g. archiving) that still warrants a password re-check. */
  submitLabel?: string
  submitPendingLabel?: string
  /** Defaults to "destructive" — pass "default" for an action that isn't itself a deletion. */
  variant?: 'destructive' | 'default'
}

/**
 * Confirmation dialog for destructive, cascading deletes (Line/Mesin/
 * Equipment — deleting any of these wipes everything nested under it) that
 * requires the acting user to re-enter their own password rather than just
 * clicking a plain "yakin hapus?" prompt.
 */
export function DeleteWithPasswordDialog({
  title,
  description,
  onConfirm,
  onSuccess,
  trigger,
  submitLabel = 'Hapus Permanen',
  submitPendingLabel = 'Menghapus...',
  variant = 'destructive',
}: DeleteWithPasswordDialogProps) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: () => onConfirm(password),
    onSuccess: () => {
      setPassword('')
      setOpen(false)
      onSuccess()
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menghapus.'
      toast.error(message)
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setPassword('')
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="delete-password">Masukkan password Anda untuk konfirmasi</Label>
            <Input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="submit" variant={variant} disabled={mutation.isPending || password.length === 0}>
              {mutation.isPending ? submitPendingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
