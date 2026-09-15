import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { addLineRuntime } from '@/features/lines/api'
import { FormSheet } from '@/components/FormSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const runtimeSchema = z.object({
  current_reading: z
    .string()
    .min(1, 'Reading wajib diisi')
    .refine((val) => Number.isInteger(Number(val)) && Number(val) >= 0, 'Harus angka bulat, minimal 0'),
  notes: z.string().optional(),
})

type RuntimeFormValues = z.infer<typeof runtimeSchema>

interface AddRuntimeDialogProps {
  lineId: number
  branchId: number
  currentHours: number
}

export function AddRuntimeDialog({ lineId, branchId, currentHours }: AddRuntimeDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<RuntimeFormValues>({
    resolver: zodResolver(runtimeSchema),
    defaultValues: { current_reading: String(currentHours) },
  })

  useEffect(() => {
    if (open) reset({ current_reading: String(currentHours) })
  }, [open, currentHours, reset])

  const mutation = useMutation({
    mutationFn: (values: RuntimeFormValues) =>
      addLineRuntime(lineId, {
        current_reading: Number(values.current_reading),
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lines', branchId] })
      queryClient.invalidateQueries({ queryKey: ['line', lineId] })
      queryClient.invalidateQueries({ queryKey: ['line-runtime-logs', lineId] })
      toast.success('Jam operasi berhasil dicatat.')
      reset()
      setOpen(false)
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal mencatat jam operasi.'
      toast.error(message)
    },
  })

  return (
    <FormSheet
      trigger={
        <Button variant="outline" size="sm">
          Catat Jam Operasi
        </Button>
      }
      title="Catat Jam Operasi"
      description={`Masukkan angka yang tertera di meteran jam operasi saat ini (bukan tambahannya) — jam operasi saat ini tercatat ${currentHours} jam.`}
      open={open}
      onOpenChange={setOpen}
      isDirty={isDirty}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      submitLabel="Simpan"
      isSubmitting={mutation.isPending}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="current_reading">Reading Meteran Saat Ini</Label>
        <Input id="current_reading" type="number" min={currentHours} {...register('current_reading')} />
        {errors.current_reading && <p className="text-sm text-destructive">{errors.current_reading.message}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="runtime-notes">Catatan (opsional)</Label>
        <Textarea id="runtime-notes" placeholder="Misal: dibaca shift pagi" {...register('notes')} />
      </div>
    </FormSheet>
  )
}
