import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { fetchPartStocksForBranch } from '@/features/part-stocks/api'
import { createTask } from '@/features/tasks/api'
import { fetchUsers } from '@/features/users/api'
import { useBranchStore } from '@/stores/branch-store'
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

const taskSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi').max(255),
  description: z.string().optional(),
  cause: z.string().optional(),
  assigned_to: z.string().optional(),
  due_date: z.string().optional(),
  part_stock_id: z.string().optional(),
  quantity_used: z.string().optional(),
})

type TaskFormValues = z.infer<typeof taskSchema>

interface TaskFormDialogProps {
  equipmentId: number
  trigger: React.ReactNode
}

export function TaskFormDialog({ equipmentId, trigger }: TaskFormDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const activeBranchId = useBranchStore((state) => state.activeBranchId)

  const { data: teknisiList } = useQuery({
    queryKey: ['users', 'teknisi'],
    queryFn: () => fetchUsers('teknisi'),
    enabled: open,
  })

  const { data: partStocks } = useQuery({
    queryKey: ['part-stocks', activeBranchId],
    queryFn: () => fetchPartStocksForBranch(activeBranchId!),
    enabled: open && !!activeBranchId,
  })

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TaskFormValues>({ resolver: zodResolver(taskSchema) })

  const partStockId = watch('part_stock_id')

  const mutation = useMutation({
    mutationFn: (values: TaskFormValues) =>
      createTask(equipmentId, {
        title: values.title,
        description: values.description,
        cause: values.cause,
        assigned_to: values.assigned_to ? Number(values.assigned_to) : null,
        due_date: values.due_date || null,
        part_stock_id: values.part_stock_id ? Number(values.part_stock_id) : null,
        quantity_used: values.quantity_used ? Number(values.quantity_used) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', equipmentId] })
      toast.success('Tugas berhasil ditambahkan.')
      setOpen(false)
    },
    onError: () => toast.error('Gagal menyimpan tugas.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Tugas</DialogTitle>
        </DialogHeader>
        <form
          className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Judul</Label>
            <Input id="title" placeholder="Perbaikan kebocoran oli" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cause">Penyebab (untuk tugas tidak terjadwal)</Label>
            <Input id="cause" placeholder="Misal: kerusakan, temuan inspeksi" {...register('cause')} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea id="description" {...register('description')} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Tugaskan ke Teknisi</Label>
            <Controller
              control={control}
              name="assigned_to"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih teknisi" />
                  </SelectTrigger>
                  <SelectContent>
                    {teknisiList?.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="due_date">Jatuh Tempo</Label>
            <Input id="due_date" type="date" {...register('due_date')} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Part yang Dipakai (opsional)</Label>
            <Controller
              control={control}
              name="part_stock_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih part" />
                  </SelectTrigger>
                  <SelectContent>
                    {partStocks?.map((stock) => (
                      <SelectItem key={stock.id} value={String(stock.id)}>
                        {stock.part_name ?? `Part #${stock.part_id}`} — stok {stock.quantity_on_hand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {partStockId && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="quantity_used">Jumlah Dipakai</Label>
              <Input id="quantity_used" type="number" min={1} {...register('quantity_used')} />
            </div>
          )}
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
