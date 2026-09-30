import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useParams } from 'react-router'
import { z } from 'zod'
import { fetchPublicDepartments } from '@/features/departments/api'
import { submitFp3Request } from '@/features/fp3/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const formSchema = z.object({
  requester_name: z.string().min(1, 'Nama wajib diisi').max(255),
  department: z.string().min(1, 'Departemen wajib diisi').max(255),
  description: z.string().min(1, 'Deskripsi wajib diisi'),
})

type FormValues = z.infer<typeof formSchema>

function errorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
    ?.response?.data
  const firstFieldError = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined
  return firstFieldError ?? data?.message ?? fallback
}

/**
 * Public (no login) "Ajukan FP3" QR-scan landing — one generic QR printed
 * per branch (see Fp3QrPrintSection), reachable by any staff member in any
 * department, not tied to any machine/line. Mirrors BreakdownScanPage's
 * centered-card shape.
 */
export function Fp3RequestPage() {
  const { branchId } = useParams<{ branchId: string }>()
  const branch = Number(branchId)
  const [submitted, setSubmitted] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: departments, isLoading: departmentsLoading } = useQuery({
    queryKey: ['public-departments'],
    queryFn: fetchPublicDepartments,
  })

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  })

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setPhotoFile(file)
    setPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!photoFile) throw new Error('no-photo')
      return submitFp3Request(branch, { ...values, photo: photoFile })
    },
    onSuccess: (data) => setSubmitted(data.code),
    onError: (error: unknown) => {
      if ((error as Error).message === 'no-photo') {
        setError('root', { message: 'Foto wajib dilampirkan.' })
        return
      }
      setError('root', { message: errorMessage(error, 'Gagal mengirim permintaan.') })
    },
  })

  if (submitted) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="flex flex-col items-center gap-3 pt-6">
            <div className="flex size-14 items-center justify-center rounded-full bg-success/15 text-2xl text-success">
              ✓
            </div>
            <h1 className="text-lg font-semibold">Permintaan FP3 Terkirim</h1>
            <p className="font-mono text-sm text-muted-foreground">{submitted}</p>
            <p className="text-sm text-muted-foreground">
              Permintaan akan dikerjakan oleh tim Teknik & Automation. Simpan nomor di atas untuk referensi.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Formulir Permintaan Perbaikan dan Pembuatan (FP3)</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="requester_name">Nama Pengaju</Label>
              <Input id="requester_name" {...register('requester_name')} />
              {errors.requester_name && <p className="text-sm text-destructive">{errors.requester_name.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="department">Departemen</Label>
              <Controller
                control={control}
                name="department"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value) => field.onChange(value ?? '')} disabled={departmentsLoading}>
                    <SelectTrigger id="department">
                      <SelectValue placeholder={departmentsLoading ? 'Memuat...' : 'Pilih departemen'} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.map((department) => (
                        <SelectItem key={department.id} value={department.name}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.department && <p className="text-sm text-destructive">{errors.department.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Deskripsi Permintaan</Label>
              <Textarea
                id="description"
                placeholder="Jelaskan kerusakan atau pekerjaan yang diminta"
                rows={4}
                {...register('description')}
              />
              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Foto</Label>
              <div className="flex items-center gap-3">
                {photoPreview ? (
                  <img src={photoPreview} alt="Pratinjau" className="size-16 shrink-0 rounded-md border object-cover" />
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-md border border-dashed text-center text-[10px] text-muted-foreground">
                    Belum ada foto
                  </div>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  {photoPreview ? 'Ganti Foto' : 'Ambil/Pilih Foto'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </div>
            </div>
            {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Mengirim...' : 'Kirim Permintaan'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
