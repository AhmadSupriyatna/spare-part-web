import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createUnit, updateUnit } from '@/features/units/api'
import type { Unit } from '@/types/inventory'
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

const unitSchema = z.object({
  name: z.string().min(1, 'Nama satuan wajib diisi').max(50),
})

type UnitFormValues = z.infer<typeof unitSchema>

interface UnitFormDialogProps {
  unit?: Unit
  trigger: React.ReactNode
}

export function UnitFormDialog({ unit, trigger }: UnitFormDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const isEdit = Boolean(unit)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: { name: unit?.name ?? '' },
  })

  useEffect(() => {
    if (open) reset({ name: unit?.name ?? '' })
  }, [open, unit, reset])

  const mutation = useMutation({
    mutationFn: (values: UnitFormValues) =>
      isEdit ? updateUnit(unit!.id, values) : createUnit(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      toast.success(isEdit ? 'Satuan berhasil diperbarui.' : 'Satuan berhasil ditambahkan.')
      setOpen(false)
    },
    onError: () => toast.error('Gagal menyimpan satuan. Mungkin nama sudah dipakai.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Ubah Satuan' : 'Tambah Satuan'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nama Satuan</Label>
            <Input id="name" placeholder="pcs" {...register('name')} />
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
