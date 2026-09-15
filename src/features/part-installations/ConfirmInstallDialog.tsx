import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { installPart } from '@/features/part-installations/api'
import { fetchUnitsForPart } from '@/features/part-units/api'
import type { Part } from '@/types/inventory'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const NEW_UNIT_VALUE = 'new'

const confirmInstallSchema = z.object({
  part_unit_id: z.string().min(1, 'Pilih unit'),
  installed_at: z.string().optional(),
  notes: z.string().optional(),
})

type ConfirmInstallValues = z.infer<typeof confirmInstallSchema>

interface ConfirmInstallDialogProps {
  equipmentId: number
  part: Part | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The popup after a part is dropped (or clicked) in PartPickerSheet — the
 * part itself is already decided, so this only asks what the drag-and-drop
 * flow can't infer: which physical unit, installation date, and notes.
 */
export function ConfirmInstallDialog({ equipmentId, part, open, onOpenChange }: ConfirmInstallDialogProps) {
  const queryClient = useQueryClient()

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConfirmInstallValues>({
    resolver: zodResolver(confirmInstallSchema),
    defaultValues: { part_unit_id: NEW_UNIT_VALUE, installed_at: '', notes: '' },
  })

  useEffect(() => {
    if (open) reset({ part_unit_id: NEW_UNIT_VALUE, installed_at: '', notes: '' })
  }, [open, part, reset])

  const { data: units } = useQuery({
    queryKey: ['part-units', part?.id],
    queryFn: () => fetchUnitsForPart(part!.id),
    enabled: open && !!part,
  })
  const availableUnits = units?.filter((unit) => unit.status === 'available')

  const mutation = useMutation({
    mutationFn: (values: ConfirmInstallValues) =>
      installPart(equipmentId, {
        part_id: part!.id,
        part_unit_id: values.part_unit_id === NEW_UNIT_VALUE ? null : Number(values.part_unit_id),
        installed_at: values.installed_at || null,
        notes: values.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-installations', equipmentId] })
      toast.success(`${part?.name} berhasil dipasang.`)
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal memasang part.'
      toast.error(message)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pasang {part?.name}</DialogTitle>
          {part && <DialogDescription className="font-mono">{part.item_master_no}</DialogDescription>}
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="installed_at">Tanggal Pasang</Label>
            <Input id="installed_at" type="date" {...register('installed_at')} />
            <p className="text-xs text-muted-foreground">Kosongkan untuk memakai waktu sekarang.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Deskripsi</Label>
            <Textarea id="notes" placeholder="Catatan pemasangan (opsional)" {...register('notes')} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Unit</Label>
            <Controller
              control={control}
              name="part_unit_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
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
              Pilih "Unit baru" kalau ini part yang belum pernah dipasang, atau pilih unit bekas yang sudah
              selesai diperbaiki untuk dipasang ulang.
            </p>
            {errors.part_unit_id && <p className="text-sm text-destructive">{errors.part_unit_id.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Memasang...' : 'Pasang'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
