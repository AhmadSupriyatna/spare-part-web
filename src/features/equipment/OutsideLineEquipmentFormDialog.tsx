import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createOutsideLineEquipment } from '@/features/equipment/api'
import { FormSheet } from '@/components/FormSheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const outsideLineEquipmentSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(255),
  category: z.string().optional(),
})

type OutsideLineEquipmentFormValues = z.infer<typeof outsideLineEquipmentSchema>

interface OutsideLineEquipmentFormDialogProps {
  branchId: number
  branchName: string
  trigger: React.ReactNode
}

/**
 * Phase 3B "Asset Outside Line" — create-only dialog for an asset that
 * belongs directly to a Branch (AC panel room, hand pallet, ...), with no
 * Line/Machine. Deliberately create-only and name-only, mirroring
 * EquipmentFormDialog's create mode: no Line/Machine picker, code is
 * system-generated server-side (see Equipment::generateCodeForBranch()).
 */
export function OutsideLineEquipmentFormDialog({ branchId, branchName, trigger }: OutsideLineEquipmentFormDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<OutsideLineEquipmentFormValues>({
    resolver: zodResolver(outsideLineEquipmentSchema),
    defaultValues: { name: '', category: '' },
  })

  useEffect(() => {
    if (open) {
      reset({ name: '', category: '' })
    }
  }, [open, reset])

  const mutation = useMutation({
    mutationFn: (values: OutsideLineEquipmentFormValues) => createOutsideLineEquipment(branchId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outside-line-equipment', branchId] })
      toast.success('Asset luar line berhasil ditambahkan.')
      setOpen(false)
    },
    onError: () => toast.error('Gagal menyimpan asset.'),
  })

  return (
    <FormSheet
      trigger={trigger}
      title="Tambah Asset Luar Line"
      description="Untuk asset yang tidak berada di bawah line produksi, seperti panel listrik, hand pallet, atau pompa air."
      open={open}
      onOpenChange={setOpen}
      isDirty={isDirty}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      submitLabel="Simpan"
      isSubmitting={mutation.isPending}
    >
      <div className="flex flex-col gap-2">
        <Label>Plant</Label>
        <p className="text-sm text-muted-foreground">{branchName}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ol-code">Kode</Label>
        <p className="text-sm text-muted-foreground italic">Dibuat otomatis dari nama saat disimpan.</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ol-name">Nama</Label>
        <Input id="ol-name" placeholder="Panel Listrik Ruang AC" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ol-category">Kategori</Label>
        <Input id="ol-category" placeholder="Elektrikal" {...register('category')} />
      </div>
    </FormSheet>
  )
}
