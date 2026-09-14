import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { addEquipmentPart } from '@/features/equipment-parts/api'
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

const equipmentPartSchema = z.object({
  part_id: z.string().min(1, 'Pilih part'),
  quantity_required: z.string().optional(),
  notes: z.string().optional(),
})

type EquipmentPartFormValues = z.infer<typeof equipmentPartSchema>

interface EquipmentPartFormDialogProps {
  equipmentId: number
  trigger: React.ReactNode
}

export function EquipmentPartFormDialog({ equipmentId, trigger }: EquipmentPartFormDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: parts } = useQuery({ queryKey: ['parts'], queryFn: fetchParts, enabled: open })

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EquipmentPartFormValues>({
    resolver: zodResolver(equipmentPartSchema),
    defaultValues: { part_id: '', quantity_required: '', notes: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: EquipmentPartFormValues) =>
      addEquipmentPart(equipmentId, {
        part_id: Number(values.part_id),
        quantity_required: values.quantity_required ? Number(values.quantity_required) : null,
        notes: values.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-parts', equipmentId] })
      toast.success('Part berhasil ditambahkan ke BOM.')
      setOpen(false)
      reset()
    },
    onError: () => toast.error('Gagal menambahkan part.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Part ke BOM</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="flex flex-col gap-2">
            <Label>Part</Label>
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
            <Label htmlFor="quantity_required">Jumlah Dibutuhkan</Label>
            <Input id="quantity_required" type="number" min={1} {...register('quantity_required')} />
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
