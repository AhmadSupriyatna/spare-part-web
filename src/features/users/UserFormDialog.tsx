import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { fetchBranches } from '@/features/branches/api'
import { ROLE_LABELS, ROLE_OPTIONS, roleNeedsBranches } from '@/features/users/roles'
import { createUser, updateUser, type UserSummary } from '@/features/users/api'
import { userSchema, type UserFormValues } from '@/features/users/schema'
import { FormSheet } from '@/components/FormSheet'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface UserFormDialogProps {
  user?: UserSummary
  trigger: React.ReactNode
}

export function UserFormDialog({ user, trigger }: UserFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const isEdit = Boolean(user)

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
  })

  const defaultValues: UserFormValues = {
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    role: user?.roles[0] ?? 'engineer',
    branch_ids: user?.branches.map((b) => b.id) ?? [],
  }

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema(isEdit)),
    defaultValues,
  })

  const role = watch('role')

  useEffect(() => {
    if (open) {
      reset(defaultValues)
      setAvatarFile(null)
      setAvatarPreview(user?.avatar_url ?? null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user, reset])

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setAvatarFile(file)
    setAvatarPreview(file ? URL.createObjectURL(file) : (user?.avatar_url ?? null))
  }

  const mutation = useMutation({
    mutationFn: (values: UserFormValues) => {
      const payload = {
        name: values.name,
        email: values.email,
        password: values.password || undefined,
        role: values.role,
        branch_ids: roleNeedsBranches(values.role) ? values.branch_ids : [],
        avatar: avatarFile,
      }
      return isEdit ? updateUser(user!.id, payload) : createUser(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(isEdit ? 'Pengguna berhasil diperbarui.' : 'Pengguna berhasil ditambahkan.')
      setOpen(false)
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menyimpan pengguna. Periksa kembali data yang diisi.'
      toast.error(message)
    },
  })

  return (
    <FormSheet
      trigger={trigger}
      title={isEdit ? 'Ubah Pengguna' : 'Tambah Pengguna'}
      open={open}
      onOpenChange={setOpen}
      isDirty={isDirty || avatarFile !== null}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      submitLabel="Simpan"
      isSubmitting={mutation.isPending}
    >
      <div className="flex items-center gap-3">
        {avatarPreview ? (
          <img src={avatarPreview} alt="Pratinjau" className="size-16 shrink-0 rounded-full border object-cover" />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full border bg-muted text-xs text-muted-foreground">
            Foto
          </div>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          {avatarPreview ? 'Ganti Foto' : 'Pilih Foto'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nama Asli</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" placeholder={isEdit ? 'Kosongkan jika tidak diubah' : ''} {...register('password')} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Tingkatan</Label>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {roleNeedsBranches(role) && (
        <div className="flex flex-col gap-2">
          <Label>Cabang</Label>
          <Controller
            control={control}
            name="branch_ids"
            render={({ field }) => (
              <div className="flex flex-col gap-1.5 rounded-md border p-2">
                {branches?.map((branch) => {
                  const checked = field.value.includes(branch.id)
                  return (
                    <label key={branch.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => {
                          field.onChange(
                            next ? [...field.value, branch.id] : field.value.filter((id) => id !== branch.id),
                          )
                        }}
                      />
                      {branch.code} — {branch.name}
                    </label>
                  )
                })}
              </div>
            )}
          />
          {errors.branch_ids && <p className="text-sm text-destructive">{errors.branch_ids.message}</p>}
        </div>
      )}
    </FormSheet>
  )
}
