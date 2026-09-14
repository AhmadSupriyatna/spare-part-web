import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createEquipment, updateEquipment } from '@/features/equipment/api'
import type { Equipment } from '@/types/tasks'
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

const equipmentSchema = z.object({
  code: z.string().min(1, 'Kode wajib diisi').max(50),
  name: z.string().min(1, 'Nama wajib diisi').max(255),
  category: z.string().optional(),
})

type EquipmentFormValues = z.infer<typeof equipmentSchema>

interface EquipmentFormDialogProps {
  machineId: number
  equipment?: Equipment
  trigger: React.ReactNode
}

export function EquipmentFormDialog({ machineId, equipment, trigger }: EquipmentFormDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const isEdit = Boolean(equipment)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      code: equipment?.code ?? '',
      name: equipment?.name ?? '',
      category: equipment?.category ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        code: equipment?.code ?? '',
        name: equipment?.name ?? '',
        category: equipment?.category ?? '',
      })
    }
  }, [open, equipment, reset])

  const mutation = useMutation({
    mutationFn: (values: EquipmentFormValues) =>
      isEdit ? updateEquipment(equipment!.id, values) : createEquipment(machineId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', machineId] })
      toast.success(isEdit ? 'Equipment berhasil diperbarui.' : 'Equipment berhasil ditambahkan.')
      setOpen(false)
    },
    onError: () => toast.error('Gagal menyimpan equipment.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Ubah Equipment' : 'Tambah Equipment'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Kode</Label>
            <Input id="code" {...register('code')} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nama</Label>
            <Input id="name" placeholder="Motor Penggerak" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="category">Kategori</Label>
            <Input id="category" placeholder="Mekanikal" {...register('category')} />
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
