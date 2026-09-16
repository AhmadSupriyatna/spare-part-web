import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { fetchCompanySetting, updateCompanySetting } from '@/features/settings/api'
import { useCanManage } from '@/stores/use-has-role'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

const settingsSchema = z.object({
  name: z.string().min(1, 'Nama perusahaan wajib diisi').max(255),
  avg_weekly_operating_hours: z
    .string()
    .min(1, 'Wajib diisi')
    .refine((val) => Number.isInteger(Number(val)) && Number(val) >= 1, 'Harus angka bulat, minimal 1'),
})

type SettingsFormValues = z.infer<typeof settingsSchema>

export function CompanySettingsPage() {
  const canManage = useCanManage()
  const queryClient = useQueryClient()
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { name: '', avg_weekly_operating_hours: '85' },
  })

  useEffect(() => {
    if (settings) {
      reset({ name: settings.name, avg_weekly_operating_hours: String(settings.avg_weekly_operating_hours) })
      setLogoPreview(settings.logo_url)
    }
  }, [settings, reset])

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setLogoFile(file)
    setLogoPreview(file ? URL.createObjectURL(file) : (settings?.logo_url ?? null))
  }

  const mutation = useMutation({
    mutationFn: (values: SettingsFormValues) =>
      updateCompanySetting({
        name: values.name,
        avg_weekly_operating_hours: Number(values.avg_weekly_operating_hours),
        logo: logoFile,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['settings', 'company'], data)
      setLogoFile(null)
      toast.success('Pengaturan perusahaan berhasil disimpan.')
    },
    onError: () => toast.error('Gagal menyimpan pengaturan.'),
  })

  if (isLoading) {
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Profil Perusahaan"
        description="Nama dan logo di sini akan muncul pada label QR yang dicetak untuk modul breakdown."
      />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Identitas Perusahaan</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
          >
            <div className="flex flex-col items-center gap-2">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Pratinjau logo"
                  className="h-24 w-auto max-w-full rounded-md border object-contain p-2"
                />
              ) : (
                <div className="flex h-24 w-48 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                  Belum ada logo
                </div>
              )}
              {canManage && (
                <Input type="file" accept="image/*" onChange={handleLogoChange} className="max-w-xs" />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nama Perusahaan</Label>
              <Input id="name" disabled={!canManage} {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="avg_weekly_operating_hours">Rata-rata Jam Operasional per Minggu</Label>
              <Input
                id="avg_weekly_operating_hours"
                type="number"
                min={1}
                max={168}
                disabled={!canManage}
                {...register('avg_weekly_operating_hours')}
              />
              <p className="text-xs text-muted-foreground">
                Dipakai untuk menghitung otomatis tanggal WO PM dari Part Lifetime — sisa jam pakai part
                dibagi angka ini menentukan berapa minggu lagi jadwalnya jatuh.
              </p>
              {errors.avg_weekly_operating_hours && (
                <p className="text-sm text-destructive">{errors.avg_weekly_operating_hours.message}</p>
              )}
            </div>

            {canManage && (
              <Button type="submit" disabled={mutation.isPending} className="self-start">
                {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
