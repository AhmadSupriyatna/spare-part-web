import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { restoreDatabase } from '@/features/database-backup/api'
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

interface RestoreDatabaseDialogProps {
  trigger: React.ReactNode
}

/**
 * The widest-blast-radius action in the app — restoring replaces every
 * table in the uploaded file, wiping whatever is currently in the
 * database. File + password confirmation, same spirit as
 * DeleteWithPasswordDialog but with an added file input, so it isn't
 * reused as-is here.
 */
export function RestoreDatabaseDialog({ trigger }: RestoreDatabaseDialogProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: () => restoreDatabase(file!, password),
    onSuccess: () => {
      toast.success('Database berhasil dipulihkan. Anda mungkin perlu login ulang.')
      setFile(null)
      setPassword('')
      setOpen(false)
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal memulihkan database.'
      toast.error(message)
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setFile(null)
          setPassword('')
        }
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pulihkan Database dari Backup?</DialogTitle>
          <DialogDescription>
            SELURUH data saat ini (part, stok, plant, budget, riwayat, dst.) akan diganti total dengan isi
            file backup ini. Tindakan ini tidak bisa dibatalkan. Pastikan file ini benar sebelum
            melanjutkan.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="restore-file">File Backup (.json)</Label>
            <Input
              id="restore-file"
              type="file"
              accept="application/json,.json"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="restore-password">Masukkan password Anda untuk konfirmasi</Label>
            <Input
              id="restore-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              variant="destructive"
              disabled={mutation.isPending || !file || password.length === 0}
            >
              {mutation.isPending ? 'Memulihkan...' : 'Pulihkan Database'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
