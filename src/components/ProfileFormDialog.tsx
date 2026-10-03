import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { updateProfile } from '@/features/auth/api'
import { useAuthStore } from '@/stores/auth-store'
import { FormSheet } from '@/components/FormSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const profileSchema = z
  .object({
    name: z.string().min(1, 'Nama wajib diisi').max(255),
    current_password: z.string().optional().or(z.literal('')),
    password: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((v) => !v || v.length >= 8, 'Minimal 8 karakter'),
  })
  .superRefine((values, ctx) => {
    if (values.password && !values.current_password) {
      ctx.addIssue({
        code: 'custom',
        path: ['current_password'],
        message: 'Masukkan password saat ini untuk mengubah password',
      })
    }
  })

type ProfileFormValues = z.infer<typeof profileSchema>

interface ProfileFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * "Edit Profil" — both ProfileMenu items ("Ubah Nama"/"Ubah Password") open
 * this same dialog (one form, one PUT /user endpoint backing both), since
 * splitting them into two separate dialogs for two fields of the same
 * record would just be two copies of the same plumbing. No visible trigger
 * of its own — opened externally from AppLayout via the controlled
 * open/onOpenChange, same hidden-trigger pattern used throughout the app
 * for menu-triggered dialogs.
 */
export function ProfileFormDialog({ open, onOpenChange }: ProfileFormDialogProps) {
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const defaultValues: ProfileFormValues = { name: user?.name ?? '', current_password: '', password: '' }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  })

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
    mutationFn: (values: ProfileFormValues) =>
      updateProfile({
        name: values.name,
        current_password: values.current_password || undefined,
        password: values.password || undefined,
        avatar: avatarFile,
      }),
    onSuccess: (updated) => {
      updateUser(updated)
      toast.success('Profil berhasil diperbarui.')
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal memperbarui profil. Periksa kembali data yang diisi.'
      toast.error(message)
    },
  })

  return (
    <FormSheet
      trigger={<span className="hidden" aria-hidden="true" />}
      title="Edit Profil"
      open={open}
      onOpenChange={onOpenChange}
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
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-name">Nama</Label>
        <Input id="profile-name" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-2 border-t pt-4">
        <Label htmlFor="profile-current-password">Password Saat Ini</Label>
        <Input id="profile-current-password" type="password" {...register('current_password')} />
        <p className="text-xs text-muted-foreground">Hanya perlu diisi kalau kamu mau ganti password.</p>
        {errors.current_password && <p className="text-sm text-destructive">{errors.current_password.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-password">Password Baru</Label>
        <Input id="profile-password" type="password" placeholder="Kosongkan jika tidak diubah" {...register('password')} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>
    </FormSheet>
  )
}
