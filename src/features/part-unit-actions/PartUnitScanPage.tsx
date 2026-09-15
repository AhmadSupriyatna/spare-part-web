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
} from '@/features/breakdown/api'
import { fetchPublicPartUnit, submitPartUnitActionRequest } from '@/features/part-unit-actions/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import type { PartUnitStatus } from '@/types/relations'

const statusLabels: Record<PartUnitStatus, string> = {
  in_service: 'Terpasang',
  pending_repair: 'Menunggu Keputusan Perbaikan',
  in_repair: 'Sedang Diperbaiki',
  available: 'Siap Dipasang',
  scrapped: 'Dibuang',
}

const removeSchema = z.object({
  requested_by_name: z.string().min(1, 'Nama wajib diisi').max(255),
  notes: z.string().optional(),
})
type RemoveFormValues = z.infer<typeof removeSchema>

const reinstallSchema = z.object({
  requested_by_name: z.string().min(1, 'Nama wajib diisi').max(255),
  branch_id: z.string().min(1, 'Pilih cabang'),
  line_id: z.string().min(1, 'Pilih line'),
  machine_id: z.string().min(1, 'Pilih mesin'),
  equipment_id: z.string().min(1, 'Pilih equipment'),
  notes: z.string().optional(),
})
type ReinstallFormValues = z.infer<typeof reinstallSchema>

function SuccessCard() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm text-center">
        <CardContent className="flex flex-col items-center gap-3 pt-6">
          <div className="flex size-14 items-center justify-center rounded-full bg-success/15 text-2xl text-success">
            ✓
          </div>
          <h1 className="text-lg font-semibold">Permintaan Terkirim</h1>
          <p className="text-sm text-muted-foreground">
            Menunggu persetujuan Engineer/Teknisi di papan kerja approval sebelum status unit ini
            resmi berubah.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function UnitBadgeInfo({
  partName,
  itemMasterNo,
}: {
  partName: string
  itemMasterNo: string
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="font-medium">{partName}</p>
      <p className="font-mono text-xs text-muted-foreground">{itemMasterNo}</p>
    </div>
  )
}

function RemoveForm({ unitId }: { unitId: number }) {
  const [submitted, setSubmitted] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RemoveFormValues>({ resolver: zodResolver(removeSchema) })

  const mutation = useMutation({
    mutationFn: (values: RemoveFormValues) =>
      submitPartUnitActionRequest(unitId, {
        action: 'remove',
        requested_by_name: values.requested_by_name,
        notes: values.notes,
      }),
    onSuccess: () => setSubmitted(true),
  })

  if (submitted) return <SuccessCard />

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="requested_by_name">Nama Anda</Label>
        <Input id="requested_by_name" placeholder="Nama teknisi lapangan" {...register('requested_by_name')} />
        {errors.requested_by_name && (
          <p className="text-sm text-destructive">{errors.requested_by_name.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Catatan (opsional)</Label>
        <Textarea id="notes" placeholder="Misal: kondisi kerusakan yang ditemukan" {...register('notes')} />
      </div>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Mengirim...' : 'Lapor: Unit Ini Dilepas'}
      </Button>
      {mutation.isError && <p className="text-sm text-destructive">Gagal mengirim. Coba lagi.</p>}
    </form>
  )
}

function ReinstallForm({ unitId }: { unitId: number }) {
  const [submitted, setSubmitted] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ReinstallFormValues>({ resolver: zodResolver(reinstallSchema) })

  const branchId = watch('branch_id')
  const lineId = watch('line_id')
  const machineId = watch('machine_id')

  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ['public-branches'],
    queryFn: fetchPublicBranches,
  })
  const { data: lines, isLoading: linesLoading } = useQuery({
    queryKey: ['public-lines', branchId],
    queryFn: () => fetchPublicLines(Number(branchId)),
    enabled: !!branchId,
  })
  const { data: machines, isLoading: machinesLoading } = useQuery({
    queryKey: ['public-machines', lineId],
    queryFn: () => fetchPublicMachines(Number(lineId)),
    enabled: !!lineId,
  })
  const { data: equipmentList, isLoading: equipmentLoading } = useQuery({
    queryKey: ['public-equipment', machineId],
    queryFn: () => fetchPublicEquipment(Number(machineId)),
    enabled: !!machineId,
  })

  const mutation = useMutation({
    mutationFn: (values: ReinstallFormValues) =>
      submitPartUnitActionRequest(unitId, {
        action: 'reinstall',
        requested_by_name: values.requested_by_name,
        equipment_id: Number(values.equipment_id),
        notes: values.notes,
      }),
    onSuccess: () => setSubmitted(true),
  })

  if (submitted) return <SuccessCard />

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="requested_by_name">Nama Anda</Label>
        <Input id="requested_by_name" placeholder="Nama teknisi lapangan" {...register('requested_by_name')} />
        {errors.requested_by_name && (
          <p className="text-sm text-destructive">{errors.requested_by_name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Cabang</Label>
        <Controller
          control={control}
          name="branch_id"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={branchesLoading}>
              <SelectTrigger>
                <SelectValue placeholder={branchesLoading ? 'Memuat...' : 'Pilih cabang'} />
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

      {branchId && (
        <div className="flex flex-col gap-2">
          <Label>Line</Label>
          <Controller
            control={control}
            name="line_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={linesLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={linesLoading ? 'Memuat...' : 'Pilih line'} />
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
      )}

      {lineId && (
        <div className="flex flex-col gap-2">
          <Label>Mesin</Label>
          <Controller
            control={control}
            name="machine_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={machinesLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={machinesLoading ? 'Memuat...' : 'Pilih mesin'} />
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
      )}

      {machineId && (
        <div className="flex flex-col gap-2">
          <Label>Equipment</Label>
          <Controller
            control={control}
            name="equipment_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={equipmentLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={equipmentLoading ? 'Memuat...' : 'Pilih equipment'} />
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
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Catatan (opsional)</Label>
        <Textarea id="notes" placeholder="Misal: hasil perbaikan" {...register('notes')} />
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Mengirim...' : 'Lapor: Unit Ini Dipasang'}
      </Button>
      {mutation.isError && <p className="text-sm text-destructive">Gagal mengirim. Coba lagi.</p>}
    </form>
  )
}

export function PartUnitScanPage() {
  const { id } = useParams<{ id: string }>()
  const unitId = Number(id)

  const { data: unit, isLoading } = useQuery({
    queryKey: ['public-part-unit', unitId],
    queryFn: () => fetchPublicPartUnit(unitId),
    enabled: Number.isFinite(unitId),
  })

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Unit {unit?.unit_code ?? ''} — Lepas/Pasang Part</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : !unit ? (
            <p className="text-sm text-destructive">Unit tidak ditemukan.</p>
          ) : (
            <>
              <UnitBadgeInfo partName={unit.part_name} itemMasterNo={unit.item_master_no} />

              {unit.status === 'in_service' && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Unit ini sedang terpasang di <strong>{unit.current_equipment?.name}</strong> (
                    {unit.current_equipment?.machine_name} · {unit.current_equipment?.line_name}).
                    Kirim laporan di bawah kalau unit ini baru saja dilepas.
                  </p>
                  <RemoveForm unitId={unit.id} />
                </>
              )}

              {unit.status === 'available' && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Unit ini sudah selesai diperbaiki dan siap dipasang kembali. Pilih equipment
                    tujuannya di bawah.
                  </p>
                  <ReinstallForm unitId={unit.id} />
                </>
              )}

              {unit.status !== 'in_service' && unit.status !== 'available' && (
                <p className="text-sm text-muted-foreground">
                  Status unit ini saat ini "{statusLabels[unit.status]}" — belum bisa dilepas atau
                  dipasang lewat scan. Hubungi tim internal kalau ini tidak sesuai.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
