import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { fetchCurrentUser } from '@/features/auth/api'
import { createBranch, updateBranch } from '@/features/branches/api'
import { useAuthStore } from '@/stores/auth-store'
import type { Branch } from '@/types/auth'
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

const branchSchema = z.object({
  code: z.string().min(1, 'Kode wajib diisi').max(50),
  name: z.string().min(1, 'Nama wajib diisi').max(255),
  address: z.string().optional(),
})

type BranchFormValues = z.infer<typeof branchSchema>

interface BranchFormDialogProps {
  branch?: Branch
  trigger: React.ReactNode
}

export function BranchFormDialog({ branch, trigger }: BranchFormDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const updateUser = useAuthStore((state) => state.updateUser)
  const isEdit = Boolean(branch)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      code: branch?.code ?? '',
      name: branch?.name ?? '',
      address: branch?.address ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({ code: branch?.code ?? '', name: branch?.name ?? '', address: branch?.address ?? '' })
    }
  }, [open, branch, reset])

  const mutation = useMutation({
    mutationFn: (values: BranchFormValues) =>
      isEdit ? updateBranch(branch!.id, values) : createBranch(values),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      // Refresh the logged-in user's accessible-branches list so the header
      // selector picks up a newly created branch without a re-login.
      const freshUser = await fetchCurrentUser()
      updateUser(freshUser)
      toast.success(isEdit ? 'Cabang berhasil diperbarui.' : 'Cabang berhasil ditambahkan.')
      setOpen(false)
    },
    onError: () => toast.error('Gagal menyimpan cabang.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Ubah Cabang' : 'Tambah Cabang'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Kode</Label>
            <Input id="code" placeholder="JKT" {...register('code')} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nama</Label>
            <Input id="name" placeholder="Cabang Jakarta" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="address">Alamat</Label>
            <Textarea id="address" {...register('address')} />
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
