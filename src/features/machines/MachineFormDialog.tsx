import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createMachine, updateMachine } from '@/features/machines/api'
import type { Machine } from '@/types/tasks'
import { FormSheet } from '@/components/FormSheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const machineSchema = z.object({
  code: z.string().min(1, 'Kode wajib diisi').max(50),
  name: z.string().min(1, 'Nama wajib diisi').max(255),
  category: z.string().optional(),
})

type MachineFormValues = z.infer<typeof machineSchema>

interface MachineFormDialogProps {
  lineId: number
  machine?: Machine
  trigger: React.ReactNode
}

export function MachineFormDialog({ lineId, machine, trigger }: MachineFormDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const isEdit = Boolean(machine)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<MachineFormValues>({
    resolver: zodResolver(machineSchema),
    defaultValues: {
      code: machine?.code ?? '',
      name: machine?.name ?? '',
      category: machine?.category ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({ code: machine?.code ?? '', name: machine?.name ?? '', category: machine?.category ?? '' })
    }
  }, [open, machine, reset])

  const mutation = useMutation({
    mutationFn: (values: MachineFormValues) =>
      isEdit ? updateMachine(machine!.id, values) : createMachine(lineId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines', lineId] })
      toast.success(isEdit ? 'Mesin berhasil diperbarui.' : 'Mesin berhasil ditambahkan.')
      setOpen(false)
    },
    onError: () => toast.error('Gagal menyimpan mesin.'),
  })

  return (
    <FormSheet
      trigger={trigger}
      title={isEdit ? 'Ubah Mesin' : 'Tambah Mesin'}
      open={open}
      onOpenChange={setOpen}
      isDirty={isDirty}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      submitLabel="Simpan"
      isSubmitting={mutation.isPending}
    >
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
      <div className="flex flex-col gap-2">
        <Label htmlFor="category">Kategori</Label>
        <Input id="category" placeholder="Produksi" {...register('category')} />
      </div>
    </FormSheet>
  )
}
