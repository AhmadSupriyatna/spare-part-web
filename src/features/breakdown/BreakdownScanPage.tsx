import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useParams } from 'react-router'
import { z } from 'zod'
import {
  fetchPublicBranches,
  fetchPublicEquipment,
  fetchPublicLines,
  fetchPublicMachines,
  fetchPublicPart,
  submitReplacementRequest,
} from '@/features/breakdown/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

const formSchema = z.object({
  branch_id: z.string().min(1, 'Pilih cabang'),
  line_id: z.string().min(1, 'Pilih line'),
  machine_id: z.string().min(1, 'Pilih mesin'),
  equipment_id: z.string().min(1, 'Pilih equipment'),
  requested_by_name: z.string().min(1, 'Nama wajib diisi').max(255),
  quantity_used: z
    .string()
    .min(1, 'Jumlah wajib diisi')
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, 'Minimal 1'),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function BreakdownScanPage() {
  const { partId } = useParams<{ partId: string }>()
  const id = Number(partId)
  const [submitted, setSubmitted] = useState(false)

  const { data: part, isLoading: partLoading } = useQuery({
    queryKey: ['public-part', id],
    queryFn: () => fetchPublicPart(id),
  })

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { quantity_used: '1' },
  })

  const branchId = watch('branch_id')
  const lineId = watch('line_id')
  const machineId = watch('machine_id')

  const { data: branches } = useQuery({
    queryKey: ['public-branches'],
    queryFn: fetchPublicBranches,
  })
  const { data: lines } = useQuery({
    queryKey: ['public-lines', branchId],
    queryFn: () => fetchPublicLines(Number(branchId)),
    enabled: !!branchId,
  })
  const { data: machines } = useQuery({
    queryKey: ['public-machines', lineId],
    queryFn: () => fetchPublicMachines(Number(lineId)),
    enabled: !!lineId,
  })
  const { data: equipmentList } = useQuery({
    queryKey: ['public-equipment', machineId],
    queryFn: () => fetchPublicEquipment(Number(machineId)),
    enabled: !!machineId,
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      submitReplacementRequest({
        part_id: id,
        equipment_id: Number(values.equipment_id),
        requested_by_name: values.requested_by_name,
        quantity_used: Number(values.quantity_used),
        reason: values.reason,
      }),
    onSuccess: () => setSubmitted(true),
  })

  if (submitted) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="flex flex-col items-center gap-3 pt-6">
            <div className="flex size-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
              ✓
            </div>
            <h1 className="text-lg font-semibold">Permintaan Terkirim</h1>
            <p className="text-sm text-muted-foreground">
              Menunggu persetujuan Engineer/Teknisi di papan kerja approval. Part lama akan
              otomatis dilepas begitu disetujui.
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
          <CardTitle>Penggantian Part (Breakdown)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {partLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : part ? (
            <div className="flex items-center gap-3 rounded-md border p-3">
              {part.image_url ? (
                <img src={part.image_url} alt={part.name} className="size-14 rounded object-cover" />
              ) : (
                <div className="flex size-14 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                  Tanpa foto
                </div>
              )}
              <div>
                <p className="font-medium">{part.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{part.item_master_no}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-destructive">Part tidak ditemukan.</p>
          )}

          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
          >
            <div className="flex flex-col gap-2">
              <Label>Cabang</Label>
              <Controller
                control={control}
                name="branch_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih cabang" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches?.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.code} — {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.branch_id && <p className="text-sm text-destructive">{errors.branch_id.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Line</Label>
              <Controller
                control={control}
                name="line_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!branchId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih line" />
                    </SelectTrigger>
                    <SelectContent>
                      {lines?.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.line_id && <p className="text-sm text-destructive">{errors.line_id.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Mesin</Label>
              <Controller
                control={control}
                name="machine_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!lineId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih mesin" />
                    </SelectTrigger>
                    <SelectContent>
                      {machines?.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.machine_id && <p className="text-sm text-destructive">{errors.machine_id.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Equipment</Label>
              <Controller
                control={control}
                name="equipment_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!machineId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipmentList?.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.equipment_id && (
                <p className="text-sm text-destructive">{errors.equipment_id.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="requested_by_name">Nama Anda</Label>
              <Input id="requested_by_name" placeholder="Nama teknisi lapangan" {...register('requested_by_name')} />
              {errors.requested_by_name && (
                <p className="text-sm text-destructive">{errors.requested_by_name.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="quantity_used">Jumlah</Label>
              <Input id="quantity_used" type="number" min={1} {...register('quantity_used')} />
              {errors.quantity_used && (
                <p className="text-sm text-destructive">{errors.quantity_used.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="reason">Alasan Penggantian</Label>
              <Textarea id="reason" placeholder="Misal: patah, aus, bocor" {...register('reason')} />
            </div>

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Mengirim...' : 'Kirim Permintaan'}
            </Button>
            {mutation.isError && (
              <p className="text-sm text-destructive">Gagal mengirim. Coba lagi.</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
