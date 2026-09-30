import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleCheck, CircleDot, FileWarning, Printer, Search, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { cancelFp3Request, completeFp3Request, receiveFp3Request, type Fp3Disposition, type Fp3Request } from '@/features/fp3/api'
import { fetchParts } from '@/features/parts/api'
import { useAuthStore } from '@/stores/auth-store'
import { useHasRole } from '@/stores/use-has-role'
import { dueDateBadge } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const statusLabels: Record<Fp3Request['status'], string> = {
  pending: 'Belum Diterima',
  in_progress: 'Sedang Dikerjakan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

const dispositionLabels: Record<NonNullable<Fp3Request['disposition']>, string> = {
  open: 'Open',
  closed: 'Closed',
  closed_with_note: 'Closed with Note',
}

const dispositionOptions: { value: Fp3Disposition; label: string; icon: typeof CircleDot }[] = [
  { value: 'open', label: 'Open', icon: CircleDot },
  { value: 'closed', label: 'Closed', icon: CircleCheck },
  { value: 'closed_with_note', label: 'Closed with Note', icon: FileWarning },
]

interface PartRow {
  key: string
  partId: number | null
  label: string
  itemMasterNo?: string
  quantity: string
  notes: string
}

interface Fp3CardProps {
  fp3: Fp3Request
  invalidateKey: unknown[]
}

/**
 * One FP3 request as a self-contained card — same shape as WoCard (a "WO
 * FP3"), so it sits in the exact same pool. The report ("Laporkan") is a
 * section that expands directly on this card, not a laci/drawer — clicking
 * it toggles `isReporting`, rendering the full paper-form-equivalent inline
 * below the summary, same "main view, not a drawer" treatment as WoCard's
 * own inline checklist.
 */
export function Fp3Card({ fp3, invalidateKey }: Fp3CardProps) {
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((state) => state.user?.id)
  const canClaim = useHasRole(['engineer', 'supervisor', 'superadmin'])
  const isMine = fp3.received_by === currentUserId
  const canAct = isMine || (fp3.received_by === null && canClaim)
  const isDone = fp3.status === 'completed' || fp3.status === 'cancelled'
  const dueBadge = dueDateBadge(fp3.due_date)

  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [isReporting, setIsReporting] = useState(false)

  // Report form state — plain useState (no react-hook-form) to match the
  // rest of this inline-on-card family (WoCard uses the same approach).
  const [workDescription, setWorkDescription] = useState('')
  const [executorNames, setExecutorNames] = useState('')
  const [areaCondition, setAreaCondition] = useState('')
  const [disposition, setDisposition] = useState<Fp3Disposition>('closed')
  const [dispositionNote, setDispositionNote] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [parts, setParts] = useState<PartRow[]>([])
  const [partSearch, setPartSearch] = useState('')
  const [manualPartName, setManualPartName] = useState('')

  const { data: allParts } = useQuery({
    queryKey: ['parts'],
    queryFn: fetchParts,
    enabled: isReporting,
  })

  const term = partSearch.trim().toLowerCase()
  const searchResults =
    term.length > 0
      ? (allParts ?? [])
          .filter((part) => !parts.some((row) => row.partId === part.id))
          .filter((part) => `${part.name} ${part.item_master_no}`.toLowerCase().includes(term))
          .slice(0, 6)
      : []

  function resetReportForm() {
    setWorkDescription('')
    setExecutorNames('')
    setAreaCondition('')
    setDisposition('closed')
    setDispositionNote('')
    setPhotoFile(null)
    setPhotoPreview(null)
    setParts([])
    setPartSearch('')
    setManualPartName('')
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setPhotoFile(file)
    setPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  function addRegisteredPart(part: { id: number; name: string; item_master_no: string }) {
    setParts((prev) => [
      ...prev,
      { key: `part-${part.id}`, partId: part.id, label: part.name, itemMasterNo: part.item_master_no, quantity: '1', notes: '' },
    ])
    setPartSearch('')
  }

  function addManualPart() {
    const name = manualPartName.trim()
    if (!name) return
    setParts((prev) => [...prev, { key: `manual-${Date.now()}`, partId: null, label: name, quantity: '1', notes: '' }])
    setManualPartName('')
  }

  function removePartRow(key: string) {
    setParts((prev) => prev.filter((row) => row.key !== key))
  }

  function updatePartRow(key: string, patch: Partial<Pick<PartRow, 'quantity' | 'notes'>>) {
    setParts((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function reportError(error: unknown, fallback: string) {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
    toast.error(message)
  }

  const receiveMutation = useMutation({
    mutationFn: () => receiveFp3Request(fp3.id, dueDate || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      toast.success('FP3 diterima.')
      setReceiveDialogOpen(false)
      setDueDate('')
    },
    onError: (error: unknown) => reportError(error, 'Gagal menerima FP3.'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelFp3Request(fp3.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      toast.success('FP3 dibatalkan.')
    },
    onError: (error: unknown) => reportError(error, 'Gagal membatalkan FP3.'),
  })

  const completeMutation = useMutation({
    mutationFn: () =>
      completeFp3Request(fp3.id, {
        work_description: workDescription,
        executor_names: executorNames,
        area_condition_after: areaCondition,
        disposition,
        disposition_note: dispositionNote || undefined,
        photo: photoFile,
        parts: parts.map((row) => ({
          part_id: row.partId ?? undefined,
          part_name_manual: row.partId ? undefined : row.label,
          quantity: Math.max(1, Math.trunc(Number(row.quantity)) || 1),
          notes: row.notes || undefined,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      toast.success('Laporan FP3 berhasil disimpan.')
      setIsReporting(false)
      resetReportForm()
    },
    onError: (error: unknown) => reportError(error, 'Gagal menyimpan laporan FP3.'),
  })

  const canSubmitReport = workDescription.trim() && executorNames.trim() && areaCondition.trim()

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-chart-2" title="WO FP3" />
          <img src={fp3.request_photo_url} alt="" className="size-12 shrink-0 rounded-md border object-cover" />
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">{fp3.code}</p>
            <p className="truncate font-medium">{fp3.requester_name}</p>
            <p className="truncate text-xs text-muted-foreground">{fp3.department}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            nativeButton={false}
            aria-label="Cetak FP3"
            title="Cetak FP3"
            render={<Link to={`/fp3/${fp3.id}/print`} />}
          >
            <Printer />
          </Button>
          <Badge
            variant={
              fp3.status === 'completed'
                ? 'success'
                : fp3.status === 'cancelled'
                  ? 'secondary'
                  : fp3.is_overdue
                    ? 'destructive'
                    : 'secondary'
            }
          >
            {fp3.is_overdue && !isDone ? 'Terlambat' : statusLabels[fp3.status]}
          </Badge>
          {fp3.disposition && <Badge variant="outline">{dispositionLabels[fp3.disposition]}</Badge>}
        </div>
      </div>

      <p className={cn('text-sm', !isDone && !isReporting && 'line-clamp-2')}>{fp3.description}</p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span>Diterima oleh: {fp3.received_by_name ?? 'Belum diterima'}</span>
        {isDone ? (
          <span>Jadwal: {fp3.due_date ? new Date(fp3.due_date).toLocaleDateString('id-ID') : '-'}</span>
        ) : (
          dueBadge && <Badge variant={dueBadge.variant}>{dueBadge.label}</Badge>
        )}
      </div>

      {isDone && fp3.work_description && (
        <div className="flex flex-col gap-1 rounded-md bg-muted/40 p-2 text-sm">
          <p className="font-medium">Uraian Pekerjaan</p>
          <p className="text-muted-foreground">{fp3.work_description}</p>
          {fp3.executor_names && <p className="text-xs text-muted-foreground">Pelaksana: {fp3.executor_names}</p>}
          {(fp3.part_usages?.length ?? 0) > 0 && (
            <ul className="mt-1 flex flex-col gap-0.5">
              {fp3.part_usages?.map((usage) => (
                <li key={usage.id} className="text-xs text-muted-foreground">
                  {usage.part_name} × {usage.quantity}
                  {!usage.is_registered && ' (manual)'}
                </li>
              ))}
            </ul>
          )}
          {fp3.completion_photo_url && (
            <img src={fp3.completion_photo_url} alt="Foto hasil" className="mt-1 max-h-32 rounded-md border object-cover" />
          )}
        </div>
      )}

      {/* Inline report section — "di tampilan main aja ga di laci": everything
          on the FP3 paper form's Pelaksana section renders directly on this
          card body once "Laporkan" is toggled, no drawer/dialog. */}
      {isReporting && (
        <div className="flex flex-col gap-3 rounded-md border border-primary/30 bg-primary/5 p-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`fp3-work-${fp3.id}`}>Uraian Pekerjaan</Label>
            <Textarea
              id={`fp3-work-${fp3.id}`}
              rows={2}
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`fp3-executors-${fp3.id}`}>Nama Pelaksana</Label>
            <Input
              id={`fp3-executors-${fp3.id}`}
              placeholder="Misal: Budi, Anto"
              value={executorNames}
              onChange={(e) => setExecutorNames(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`fp3-area-${fp3.id}`}>Kondisi Area Setelah Pengerjaan</Label>
            <Textarea
              id={`fp3-area-${fp3.id}`}
              rows={2}
              value={areaCondition}
              onChange={(e) => setAreaCondition(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Foto Hasil Pengerjaan</Label>
            <div className="flex items-center gap-2">
              {photoPreview ? (
                <img src={photoPreview} alt="Pratinjau" className="size-12 shrink-0 rounded-md border object-cover" />
              ) : (
                <div className="flex size-12 shrink-0 items-center justify-center rounded-md border border-dashed text-center text-[9px] text-muted-foreground">
                  Opsional
                </div>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                {photoPreview ? 'Ganti Foto' : 'Pilih Foto'}
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Spare Part Yang Dipakai</Label>
            <p className="text-xs text-muted-foreground">
              Cari part yang terdaftar, atau isi manual kalau tidak ada di sistem.
            </p>

            {parts.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {parts.map((row) => (
                  <div key={row.key} className="flex items-center gap-2 rounded-md border bg-card p-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {row.label}
                        {row.partId === null && <span className="ml-1 text-xs text-muted-foreground">(manual)</span>}
                      </p>
                      {row.itemMasterNo && <p className="truncate font-mono text-xs text-muted-foreground">{row.itemMasterNo}</p>}
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) => updatePartRow(row.key, { quantity: e.target.value })}
                      className="h-8 w-16 shrink-0 text-center"
                      aria-label={`Jumlah ${row.label}`}
                    />
                    <Input
                      value={row.notes}
                      onChange={(e) => updatePartRow(row.key, { notes: e.target.value })}
                      placeholder="Keterangan"
                      className="h-8 w-28 shrink-0"
                      aria-label={`Keterangan ${row.label}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Hapus ${row.label}`}
                      onClick={() => removePartRow(row.key)}
                    >
                      <X />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                placeholder="Cari part terdaftar..."
                className="h-8 pl-8"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="flex flex-col gap-1 rounded-md border p-1">
                {searchResults.map((part) => (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => addRegisteredPart(part)}
                    className="flex flex-col items-start rounded px-2 py-1 text-left text-sm hover:bg-muted"
                  >
                    <span className="truncate font-medium">{part.name}</span>
                    <span className="truncate font-mono text-xs text-muted-foreground">{part.item_master_no}</span>
                  </button>
                ))}
              </div>
            )}
            {term.length > 0 && searchResults.length === 0 && (
              <p className="text-xs text-muted-foreground">Tidak ditemukan di sistem.</p>
            )}

            <div className="flex items-center gap-2">
              <Input
                value={manualPartName}
                onChange={(e) => setManualPartName(e.target.value)}
                placeholder="Part tidak terdaftar? ketik nama manual..."
                className="h-8 flex-1"
              />
              <Button type="button" variant="outline" size="sm" disabled={!manualPartName.trim()} onClick={addManualPart}>
                Tambah Manual
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <div className="grid grid-cols-3 gap-2">
              {dispositionOptions.map((option) => {
                const Icon = option.icon
                const selected = disposition === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDisposition(option.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-md border bg-card p-2 text-xs font-medium transition-colors',
                      selected ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <Icon className="size-4" />
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          {disposition !== 'closed' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`fp3-note-${fp3.id}`}>Catatan</Label>
              <Textarea
                id={`fp3-note-${fp3.id}`}
                rows={2}
                value={dispositionNote}
                onChange={(e) => setDispositionNote(e.target.value)}
                placeholder={disposition === 'open' ? 'Kenapa masih open / tindak lanjut apa yang diperlukan' : 'Catatan penutupan'}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsReporting(false)
                resetReportForm()
              }}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!canSubmitReport || completeMutation.isPending}
              onClick={() => completeMutation.mutate()}
            >
              {completeMutation.isPending ? 'Menyimpan...' : 'Simpan Laporan'}
            </Button>
          </div>
        </div>
      )}

      {canAct && !isDone && !isReporting && (
        <div className="flex justify-end gap-2 border-t pt-3">
          <Button size="sm" variant="ghost" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
            Batal
          </Button>
          {fp3.status === 'pending' && (
            <Button size="sm" variant="outline" onClick={() => setReceiveDialogOpen(true)}>
              Terima
            </Button>
          )}
          <Button size="sm" onClick={() => setIsReporting(true)}>
            Laporkan
          </Button>
        </div>
      )}

      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Terima FP3</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`fp3-due-date-${fp3.id}`}>Jadwalkan (opsional)</Label>
            <Input id={`fp3-due-date-${fp3.id}`} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Kosongkan kalau langsung dikerjakan sekarang, atau pilih tanggal untuk dijadwalkan nanti.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReceiveDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => receiveMutation.mutate()} disabled={receiveMutation.isPending}>
              {receiveMutation.isPending ? 'Menyimpan...' : 'Terima'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
