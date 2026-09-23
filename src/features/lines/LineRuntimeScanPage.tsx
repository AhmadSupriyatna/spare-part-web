import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Gauge } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router'
import { z } from 'zod'
import { addLineRuntime, fetchLine } from '@/features/lines/api'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

const runtimeSchema = z.object({
  current_reading: z
    .string()
    .min(1, 'Reading wajib diisi')
    .refine((val) => Number.isInteger(Number(val)) && Number(val) >= 0, 'Harus angka bulat, minimal 0'),
  notes: z.string().optional(),
})

type RuntimeFormValues = z.infer<typeof runtimeSchema>

/**
 * Landing page for the QR code printed on each Line — scanning it always
 * requires login first (ProtectedRoute bounces to /login and, thanks to
 * the `from` state it now preserves, back here afterward), but doesn't
 * need any extra role check beyond that: Engineer/Supervisor/Admin Spare
 * Part/Superadmin are the only roles that exist, and POST /lines/{line}/
 * runtime already permits any authenticated one. No AppLayout chrome
 * (sidebar/header) — this is meant to be a quick in-and-out action from a
 * phone camera, same spirit as the public breakdown/part-unit scan pages,
 * just gated by login instead of being fully public.
 */
export function LineRuntimeScanPage() {
  const { id } = useParams<{ id: string }>()
  const lineId = Number(id)
  const queryClient = useQueryClient()
  const [justSaved, setJustSaved] = useState<{ reading: number } | null>(null)

  const {
    data: line,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['line', lineId],
    queryFn: () => fetchLine(lineId),
    enabled: Number.isFinite(lineId),
  })

  const branches = useAuthStore((state) => state.user?.branches ?? [])
  const canAccessBranch = !line || branches.some((b) => b.id === line.branch_id)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RuntimeFormValues>({ resolver: zodResolver(runtimeSchema) })

  const mutation = useMutation({
    mutationFn: (values: RuntimeFormValues) =>
      addLineRuntime(lineId, {
        current_reading: Number(values.current_reading),
        notes: values.notes || undefined,
      }),
    onSuccess: (updatedLine, values) => {
      queryClient.invalidateQueries({ queryKey: ['line', lineId] })
      queryClient.invalidateQueries({ queryKey: ['lines', updatedLine.branch_id] })
      queryClient.invalidateQueries({ queryKey: ['line-runtime-logs', lineId] })
      setJustSaved({ reading: Number(values.current_reading) })
      reset()
    },
  })

  const errorMessage =
    (mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    'Gagal mencatat jam operasi.'

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Gauge className="size-5" />
          </div>
          <CardTitle>Catat Jam Operasi</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : isError || !line ? (
            <p className="text-center text-sm text-destructive">Line tidak ditemukan.</p>
          ) : !canAccessBranch ? (
            <p className="text-center text-sm text-destructive">Anda tidak memiliki akses ke plant ini.</p>
          ) : (
            <>
              <div className="rounded-md border p-3 text-center">
                <p className="font-medium">{line.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{line.code}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Jam operasi tercatat: <strong>{line.runtime_hours}</strong> jam
                </p>
              </div>

              {justSaved ? (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <CheckCircle2 className="size-10 text-success" />
                  <p className="text-sm font-medium">Tersimpan — {justSaved.reading} jam</p>
                  <Button variant="outline" size="sm" onClick={() => setJustSaved(null)}>
                    Catat Lagi
                  </Button>
                </div>
              ) : (
                <form
                  className="flex flex-col gap-4"
                  onSubmit={handleSubmit((values) => mutation.mutate(values))}
                >
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="current_reading">Reading Meteran Saat Ini</Label>
                    <Input
                      id="current_reading"
                      type="number"
                      inputMode="numeric"
                      min={line.runtime_hours}
                      autoFocus
                      {...register('current_reading')}
                    />
                    {errors.current_reading && (
                      <p className="text-sm text-destructive">{errors.current_reading.message}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="runtime-notes">Catatan (opsional)</Label>
                    <Textarea id="runtime-notes" placeholder="Misal: dibaca shift pagi" {...register('notes')} />
                  </div>
                  {mutation.isError && <p className="text-sm text-destructive">{errorMessage}</p>}
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                </form>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
