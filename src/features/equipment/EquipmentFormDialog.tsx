import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { fetchAssetCategories } from '@/features/asset-categories/api'
import { createEquipment, updateEquipment } from '@/features/equipment/api'
import type { Equipment } from '@/types/tasks'
import { FormSheet } from '@/components/FormSheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const NO_CATEGORY = 'none'

const equipmentSchema = z.object({
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
  const { data: categories, isLoading: categoriesLoading, isError: categoriesError } = useQuery({
    queryKey: ['asset-categories'],
    queryFn: fetchAssetCategories,
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      name: equipment?.name ?? '',
      category: equipment?.category ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: equipment?.name ?? '',
        category: equipment?.category ?? '',
      })
    }
  }, [open, equipment, reset])

  const mutation = useMutation({
    mutationFn: (values: EquipmentFormValues) => {
      const payload = { ...values, category: values.category || null }
      return isEdit ? updateEquipment(equipment!.id, payload) : createEquipment(machineId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', machineId] })
      toast.success(isEdit ? 'Equipment berhasil diperbarui.' : 'Equipment berhasil ditambahkan.')
      setOpen(false)
    },
    onError: () => toast.error('Gagal menyimpan equipment.'),
  })

  return (
    <FormSheet
      trigger={trigger}
      title={isEdit ? 'Ubah Equipment' : 'Tambah Equipment'}
      open={open}
      onOpenChange={setOpen}
      isDirty={isDirty}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      submitLabel="Simpan"
      isSubmitting={mutation.isPending}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="code">Kode</Label>
        {isEdit ? (
          <Input id="code" value={equipment!.code} disabled readOnly className="font-mono text-muted-foreground" />
        ) : (
          <p className="text-sm text-muted-foreground italic">Dibuat otomatis dari nama saat disimpan.</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nama</Label>
        <Input id="name" placeholder="Motor Penggerak" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="category">Kategori</Label>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select
              value={categories?.find((category) => category.type === 'equipment' && category.name === field.value)?.id.toString() ?? NO_CATEGORY}
              onValueChange={(value) => field.onChange(categories?.find((category) => String(category.id) === value)?.name ?? '')}
              disabled={categoriesLoading || categoriesError}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder={categoriesLoading ? 'Memuat kategori...' : 'Pilih kategori'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>Tanpa kategori</SelectItem>
                {categories?.filter((category) => category.type === 'equipment').map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {categoriesError && <p className="text-sm text-destructive">Gagal memuat kategori equipment.</p>}
      </div>
    </FormSheet>
  )
}
