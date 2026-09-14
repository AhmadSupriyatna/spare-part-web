import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { addTaskLibraryPart } from '@/features/task-libraries/api'
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

const partSchema = z.object({
  part_id: z.string().min(1, 'Pilih part'),
  quantity_required: z
    .string()
    .min(1, 'Jumlah wajib diisi')
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, 'Minimal 1'),
  notes: z.string().optional(),
})

type PartFormValues = z.infer<typeof partSchema>

interface TaskLibraryPartFormDialogProps {
  taskLibraryId: number
  equipmentId: number
  trigger: React.ReactNode
}

export function TaskLibraryPartFormDialog({
  taskLibraryId,
  equipmentId,
  trigger,
}: TaskLibraryPartFormDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: parts } = useQuery({ queryKey: ['parts'], queryFn: fetchParts, enabled: open })

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PartFormValues>({
    resolver: zodResolver(partSchema),
    defaultValues: { part_id: '', quantity_required: '1', notes: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: PartFormValues) =>
      addTaskLibraryPart(taskLibraryId, {
        part_id: Number(values.part_id),
        quantity_required: Number(values.quantity_required),
        notes: values.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-libraries', equipmentId] })
      toast.success('Part berhasil ditambahkan ke checklist.')
      setOpen(false)
      reset()
    },
    onError: () => toast.error('Gagal menambahkan part — mungkin sudah ada di checklist ini.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Part ke Checklist</DialogTitle>
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
            <Label htmlFor="quantity_required">Jumlah Direncanakan</Label>
            <Input id="quantity_required" type="number" min={1} {...register('quantity_required')} />
            {errors.quantity_required && (
              <p className="text-sm text-destructive">{errors.quantity_required.message}</p>
            )}
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
