import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { addLineKwh } from '@/features/lines/api'
import { fetchCompanySetting } from '@/features/settings/api'
import { FormSheet } from '@/components/FormSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const kwhSchema = z.object({
  for_date: z.string().min(1, 'Tanggal wajib diisi'),
  value: z
    .string()
    .min(1, 'Wajib diisi')
    .refine((val) => Number.isInteger(Number(val)) && Number(val) >= 0, 'Harus angka bulat, minimal 0'),
  notes: z.string().optional(),
})

type KwhFormValues = z.infer<typeof kwhSchema>

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

interface AddKwhDialogProps {
  lineId: number
}

/**
 * Mirrors AddRuntimeDialog's shape, but the field label/help text switches
 * on CompanySetting.kwh_input_mode ("reading" = meter's absolute value,
 * "direct" = that week's usage typed as-is) — the backend upserts by
 * (line, week), so resubmitting for the same week corrects it rather than
 * creating a duplicate, which is why there's no separate edit flow here.
 */
export function AddKwhDialog({ lineId }: AddKwhDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })
  const mode = companySetting?.kwh_input_mode ?? 'direct'

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<KwhFormValues>({
    resolver: zodResolver(kwhSchema),
    defaultValues: { for_date: todayIso(), value: '' },
  })

  useEffect(() => {
    if (open) reset({ for_date: todayIso(), value: '' })
  }, [open, reset])

  const mutation = useMutation({
    mutationFn: (values: KwhFormValues) =>
      addLineKwh(lineId, {
        for_date: values.for_date,
        value: Number(values.value),
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-kwh-logs', lineId] })
      toast.success('Pemakaian kWh berhasil dicatat.')
      reset()
      setOpen(false)
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal mencatat kWh.'
      toast.error(message)
    },
  })

  return (
    <FormSheet
      trigger={
        <Button variant="outline" size="sm">
          Input kWh
        </Button>
      }
      title="Input kWh"
      description={
        mode === 'reading'
          ? 'Masukkan angka yang tertera di meteran kWh untuk minggu ini — sistem otomatis hitung selisihnya dari minggu sebelumnya.'
          : 'Masukkan total pemakaian kWh untuk minggu ini.'
      }
      open={open}
      onOpenChange={setOpen}
      isDirty={isDirty}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      submitLabel="Simpan"
      isSubmitting={mutation.isPending}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="kwh-for-date">Untuk Minggu (tanggal berapa saja dalam minggu itu)</Label>
        <Input id="kwh-for-date" type="date" {...register('for_date')} />
        {errors.for_date && <p className="text-sm text-destructive">{errors.for_date.message}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="kwh-value">{mode === 'reading' ? 'Reading Meteran kWh Saat Ini' : 'Pemakaian Minggu Ini (kWh)'}</Label>
        <Input id="kwh-value" type="number" min={0} {...register('value')} />
        {errors.value && <p className="text-sm text-destructive">{errors.value.message}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="kwh-notes">Catatan (opsional)</Label>
        <Textarea id="kwh-notes" placeholder="Misal: dibaca shift pagi" {...register('notes')} />
      </div>
    </FormSheet>
  )
}
