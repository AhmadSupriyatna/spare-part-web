import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createLine, updateLine } from '@/features/lines/api'
import type { ProductionLine } from '@/types/tasks'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const lineSchema = z.object({
  code: z.string().min(1, 'Kode wajib diisi').max(50),
  name: z.string().min(1, 'Nama wajib diisi').max(255),
})

type LineFormValues = z.infer<typeof lineSchema>

interface LineFormDialogProps {
  branchId: number
  line?: ProductionLine
  trigger: React.ReactNode
}

export function LineFormDialog({ branchId, line, trigger }: LineFormDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const isEdit = Boolean(line)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LineFormValues>({
    resolver: zodResolver(lineSchema),
    defaultValues: { code: line?.code ?? '', name: line?.name ?? '' },
  })

  useEffect(() => {
    if (open) reset({ code: line?.code ?? '', name: line?.name ?? '' })
  }, [open, line, reset])

  const mutation = useMutation({
    mutationFn: (values: LineFormValues) =>
      isEdit ? updateLine(line!.id, values) : createLine(branchId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lines', branchId] })
      toast.success(isEdit ? 'Line berhasil diperbarui.' : 'Line berhasil ditambahkan.')
      setOpen(false)
    },
    onError: () => toast.error('Gagal menyimpan line.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Ubah Line' : 'Tambah Line'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Kode</Label>
            <Input id="code" {...register('code')} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nama</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
