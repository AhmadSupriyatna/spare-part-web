import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { installPart } from '@/features/part-installations/api'
import { fetchUnitsForPart } from '@/features/part-units/api'
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

const NEW_UNIT_VALUE = 'new'

const partInstallationSchema = z.object({
  part_id: z.string().min(1, 'Pilih part'),
  part_unit_id: z.string().min(1, 'Pilih unit'),
  installed_at: z.string().optional(),
  notes: z.string().optional(),
})

type PartInstallationFormValues = z.infer<typeof partInstallationSchema>

interface PartInstallationFormDialogProps {
  equipmentId: number
  trigger: React.ReactNode
}

export function PartInstallationFormDialog({ equipmentId, trigger }: PartInstallationFormDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: parts } = useQuery({ queryKey: ['parts'], queryFn: fetchParts, enabled: open })

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PartInstallationFormValues>({
    resolver: zodResolver(partInstallationSchema),
    defaultValues: { part_id: '', part_unit_id: NEW_UNIT_VALUE, installed_at: '', notes: '' },
  })

  const partId = watch('part_id')

  const { data: units } = useQuery({
    queryKey: ['part-units', partId],
    queryFn: () => fetchUnitsForPart(Number(partId)),
    enabled: open && !!partId,
  })
  const availableUnits = units?.filter((unit) => unit.status === 'available')

  const mutation = useMutation({
    mutationFn: (values: PartInstallationFormValues) =>
      installPart(equipmentId, {
        part_id: Number(values.part_id),
        part_unit_id: values.part_unit_id === NEW_UNIT_VALUE ? null : Number(values.part_unit_id),
        installed_at: values.installed_at || null,
        notes: values.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-installations', equipmentId] })
      toast.success('Part berhasil dipasang.')
      setOpen(false)
      reset()
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal memasang part.'
      toast.error(message)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pasang Part</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="flex flex-col gap-2">
            <Label>Part</Label>
            <Controller
              control={control}
              name="part_id"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih part" />
                  </SelectTrigger>
                  <SelectContent>
                    {parts?.map((part) => (
                      <SelectItem key={part.id} value={String(part.id)}>
                        {part.name} ({part.item_master_no})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.part_id && <p className="text-sm text-destructive">{errors.part_id.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Unit</Label>
            <Controller
              control={control}
              name="part_unit_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!partId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NEW_UNIT_VALUE}>+ Unit baru</SelectItem>
                    {availableUnits?.map((unit) => (
                      <SelectItem key={unit.id} value={String(unit.id)}>
                        Unit {unit.unit_code} — sudah dipakai {unit.percent_used ?? 0}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Pilih "Unit baru" kalau ini part yang belum pernah dipasang. Pilih unit yang ada di daftar
              kalau ini pemasangan ulang unit bekas yang sudah selesai diperbaiki.
            </p>
            {errors.part_unit_id && (
              <p className="text-sm text-destructive">{errors.part_unit_id.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="installed_at">Tanggal Pasang</Label>
            <Input id="installed_at" type="date" {...register('installed_at')} />
            <p className="text-xs text-muted-foreground">Kosongkan untuk memakai waktu sekarang.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" {...register('notes')} />
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
