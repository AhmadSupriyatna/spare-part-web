import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createWorkOrder } from '@/features/work-orders/api'
import { fetchParts } from '@/features/parts/api'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const workOrderSchema = z
  .object({
    title: z.string().min(1, 'Judul wajib diisi').max(255),
    description: z.string().optional(),
    schedule_type: z.enum(['calendar', 'runtime', 'unscheduled']),
    interval_days: z.string().optional(),
    interval_hours: z.string().optional(),
    part_id: z.string().optional(),
  })
  .refine((values) => values.schedule_type !== 'calendar' || !!values.interval_days, {
    message: 'Interval hari wajib diisi untuk jadwal berdasarkan kalender',
    path: ['interval_days'],
  })
  .refine((values) => values.schedule_type !== 'runtime' || !!values.interval_hours, {
    message: 'Interval jam wajib diisi untuk jadwal berdasarkan jam operasi',
    path: ['interval_hours'],
  })

function extractErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
    const firstFieldError = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined
    return firstFieldError ?? data?.message ?? fallback
  }
  return fallback
}

type WorkOrderFormValues = z.infer<typeof workOrderSchema>

const scheduleLabels = {
  calendar: 'Berdasarkan Kalender (hari)',
  runtime: 'Berdasarkan Jam Operasi Mesin',
  unscheduled: 'Tidak Terjadwal (reaktif/kerusakan)',
}

interface WorkOrderFormDialogProps {
  equipmentId: number
  trigger: React.ReactNode
}

export function WorkOrderFormDialog({ equipmentId, trigger }: WorkOrderFormDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: parts } = useQuery({ queryKey: ['parts'], queryFn: fetchParts, enabled: open })

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: { schedule_type: 'calendar' },
  })

  const scheduleType = watch('schedule_type')

  const mutation = useMutation({
    mutationFn: (values: WorkOrderFormValues) =>
      createWorkOrder(equipmentId, {
        title: values.title,
        description: values.description,
        schedule_type: values.schedule_type,
        interval_days: values.interval_days ? Number(values.interval_days) : null,
        interval_hours: values.interval_hours ? Number(values.interval_hours) : null,
        part_id: values.part_id ? Number(values.part_id) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders', equipmentId] })
      toast.success('Work order berhasil ditambahkan.')
      setOpen(false)
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Gagal menyimpan work order.')),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Work Order</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Judul</Label>
            <Input id="title" placeholder="Ganti oli pelumas" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea id="description" {...register('description')} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Jenis Jadwal</Label>
            <Controller
              control={control}
              name="schedule_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(scheduleLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {scheduleType === 'calendar' && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="interval_days">Interval (hari)</Label>
              <Input id="interval_days" type="number" min={1} {...register('interval_days')} />
              {errors.interval_days && (
                <p className="text-sm text-destructive">{errors.interval_days.message}</p>
              )}
            </div>
          )}
          {scheduleType === 'runtime' && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="interval_hours">Interval (jam operasi mesin)</Label>
              <Input id="interval_hours" type="number" min={1} {...register('interval_hours')} />
              {errors.interval_hours && (
                <p className="text-sm text-destructive">{errors.interval_hours.message}</p>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label>Part Terkait (opsional)</Label>
            <Controller
              control={control}
              name="part_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih part" />
                  </SelectTrigger>
                  <SelectContent>
                    {parts?.map((part) => (
                      <SelectItem key={part.id} value={String(part.id)}>
                        {part.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
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
