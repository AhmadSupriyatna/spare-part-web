import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createDepartment, updateDepartment, type Department } from '@/features/departments/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const departmentSchema = z.object({
  name: z.string().min(1, 'Nama departemen wajib diisi').max(100),
})

type DepartmentFormValues = z.infer<typeof departmentSchema>

interface DepartmentFormDialogProps {
  department?: Department
  trigger: React.ReactNode
}

export function DepartmentFormDialog({ department, trigger }: DepartmentFormDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const isEdit = Boolean(department)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: department?.name ?? '' },
  })

  useEffect(() => {
    if (open) reset({ name: department?.name ?? '' })
  }, [open, department, reset])

  const mutation = useMutation({
    mutationFn: (values: DepartmentFormValues) =>
      isEdit ? updateDepartment(department!.id, values) : createDepartment(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      toast.success(isEdit ? 'Departemen berhasil diperbarui.' : 'Departemen berhasil ditambahkan.')
      setOpen(false)
    },
    onError: () => toast.error('Gagal menyimpan departemen. Mungkin nama sudah dipakai.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Ubah Departemen' : 'Tambah Departemen'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nama Departemen</Label>
            <Input id="name" placeholder="Produksi" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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
