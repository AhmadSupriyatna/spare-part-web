import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { fetchAssetCategories } from '@/features/asset-categories/api'
import { createOutsideLineEquipment } from '@/features/equipment/api'
import { FormSheet } from '@/components/FormSheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const NO_CATEGORY = 'none'

const outsideLineEquipmentSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(255),
  category: z.string().optional(),
})

type OutsideLineEquipmentFormValues = z.infer<typeof outsideLineEquipmentSchema>

interface OutsideLineEquipmentFormDialogProps {
  branchId: number
  branchName: string
  trigger: React.ReactNode
  /**
   * Controlled open state — needed when the trigger lives inside a
   * DropdownMenu: the menu unmounts its popup content (and everything
   * nested in it, including this dialog's own internal `open` state) the
   * instant an item is clicked, so open state must be lifted to a parent
   * that outlives the menu. Falls back to internal state otherwise.
   */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Phase 3B "Asset Outside Line" — create-only dialog for an asset that
 * belongs directly to a Branch (AC panel room, hand pallet, ...), with no
 * Line/Machine. Deliberately create-only and name-only, mirroring
 * EquipmentFormDialog's create mode: no Line/Machine picker, code is
 * system-generated server-side (see Equipment::generateCodeForBranch()).
 */
export function OutsideLineEquipmentFormDialog({
  branchId,
  branchName,
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: OutsideLineEquipmentFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChangeProp ?? setInternalOpen
  const queryClient = useQueryClient()
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
    mutationFn: (values: OutsideLineEquipmentFormValues) =>
      createOutsideLineEquipment(branchId, { ...values, category: values.category || null }),
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
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select
              value={categories?.find((category) => category.type === 'equipment' && category.name === field.value)?.id.toString() ?? NO_CATEGORY}
              onValueChange={(value) => field.onChange(categories?.find((category) => String(category.id) === value)?.name ?? '')}
              disabled={categoriesLoading || categoriesError}
            >
              <SelectTrigger id="ol-category">
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
