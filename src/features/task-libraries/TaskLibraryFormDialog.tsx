import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createTaskLibrary, updateTaskLibrary } from '@/features/task-libraries/api'
import type { TaskLibrary } from '@/types/pm'
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
import { Textarea } from '@/components/ui/textarea'

const taskLibrarySchema = z.object({
  title: z.string().min(1, 'Nama kegiatan wajib diisi').max(255),
  description: z.string().optional(),
})

type TaskLibraryFormValues = z.infer<typeof taskLibrarySchema>

interface TaskLibraryFormDialogProps {
  equipmentId: number
  library?: TaskLibrary
  trigger: React.ReactNode
}

export function TaskLibraryFormDialog({ equipmentId, library, trigger }: TaskLibraryFormDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const isEdit = Boolean(library)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskLibraryFormValues>({
    resolver: zodResolver(taskLibrarySchema),
    defaultValues: { title: library?.title ?? '', description: library?.description ?? '' },
  })

  useEffect(() => {
    if (open) reset({ title: library?.title ?? '', description: library?.description ?? '' })
  }, [open, library, reset])

  const mutation = useMutation({
    mutationFn: (values: TaskLibraryFormValues) =>
      isEdit ? updateTaskLibrary(library!.id, values) : createTaskLibrary(equipmentId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-libraries', equipmentId] })
      toast.success(isEdit ? 'Task Library berhasil diperbarui.' : 'Task Library berhasil ditambahkan.')
      setOpen(false)
    },
    onError: () => toast.error('Gagal menyimpan Task Library.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Ubah Task Library' : 'Tambah Task Library'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Nama Kegiatan</Label>
            <Input id="title" placeholder="Ganti Oli & Filter" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea id="description" placeholder="Detail langkah kerja (opsional)" {...register('description')} />
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
