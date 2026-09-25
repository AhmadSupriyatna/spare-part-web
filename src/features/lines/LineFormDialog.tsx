import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createLine, updateLine } from '@/features/lines/api'
import type { ProductionLine } from '@/types/tasks'
import { FormSheet } from '@/components/FormSheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const lineSchema = z.object({
  code: z.string().min(1, 'Kode wajib diisi').max(50),
  name: z.string().min(1, 'Nama wajib diisi').max(255),
  avg_weekly_operating_hours: z
    .string()
    .optional()
    .refine(
      (val) => !val || (Number.isInteger(Number(val)) && Number(val) >= 1 && Number(val) <= 168),
      'Harus angka bulat 1-168',
    ),
})

type LineFormValues = z.infer<typeof lineSchema>

interface LineFormDialogProps {
  branchId: number
  line?: ProductionLine
  trigger: React.ReactNode
  /**
   * Controlled open state — needed when the trigger lives inside a
   * DropdownMenu: the menu unmounts its popup content (and everything
   * nested in it, including this dialog's own internal `open` state) the
   * instant an item is clicked, so open state must be lifted to a parent
   * that outlives the menu. Falls back to internal state for every other
   * (non-menu) call site.
   */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function LineFormDialog({ branchId, line, trigger, open: openProp, onOpenChange: onOpenChangeProp }: LineFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChangeProp ?? setInternalOpen
  const queryClient = useQueryClient()
  const isEdit = Boolean(line)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<LineFormValues>({
    resolver: zodResolver(lineSchema),
    defaultValues: {
      code: line?.code ?? '',
      name: line?.name ?? '',
      avg_weekly_operating_hours: line?.avg_weekly_operating_hours ? String(line.avg_weekly_operating_hours) : '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        code: line?.code ?? '',
        name: line?.name ?? '',
        avg_weekly_operating_hours: line?.avg_weekly_operating_hours ? String(line.avg_weekly_operating_hours) : '',
      })
    }
  }, [open, line, reset])

  const mutation = useMutation({
    mutationFn: (values: LineFormValues) => {
      const payload = {
        code: values.code,
        name: values.name,
        avg_weekly_operating_hours: values.avg_weekly_operating_hours ? Number(values.avg_weekly_operating_hours) : null,
      }
      return isEdit ? updateLine(line!.id, payload) : createLine(branchId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lines', branchId] })
      toast.success(isEdit ? 'Line berhasil diperbarui.' : 'Line berhasil ditambahkan.')
      setOpen(false)
    },
    onError: () => toast.error('Gagal menyimpan line.'),
  })

  return (
    <FormSheet
      trigger={trigger}
      title={isEdit ? 'Ubah Line' : 'Tambah Line'}
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
        <Label htmlFor="avg_weekly_operating_hours">Rata-rata Jam Operasi/Minggu (opsional)</Label>
        <Input
          id="avg_weekly_operating_hours"
          type="number"
          min={1}
          max={168}
          placeholder="Ikuti default perusahaan jika kosong"
          {...register('avg_weekly_operating_hours')}
        />
        {errors.avg_weekly_operating_hours && (
          <p className="text-sm text-destructive">{errors.avg_weekly_operating_hours.message}</p>
        )}
      </div>
    </FormSheet>
  )
}
